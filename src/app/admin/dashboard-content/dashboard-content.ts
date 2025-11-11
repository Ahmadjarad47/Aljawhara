import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineController,
  BarController,
  DoughnutController,
} from 'chart.js';
import { DashService } from './dash-service';
import { 
  DashboardSummaryDto, 
  OrderSummaryDto, 
  UserSummaryDto, 
  TimeSeriesPointDto,
  Period 
} from './dash.models';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineController,
  BarController,
  DoughnutController
);

@Component({
  selector: 'app-dashboard-content',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './dashboard-content.html',
  styleUrl: './dashboard-content.css'
})
export class DashboardContent implements OnInit {
  private readonly dashService = inject(DashService);

  // Signals for reactive state management
  summary = signal<DashboardSummaryDto | null>(null);
  lastOrders = signal<OrderSummaryDto[]>([]);
  lastUsers = signal<UserSummaryDto[]>([]);
  usersChartRawData = signal<TimeSeriesPointDto[]>([]);
  revenueChartRawData = signal<TimeSeriesPointDto[]>([]);
  selectedPeriod = signal<Period>('30d');
  isLoading = signal(false);

  // Computed signals
  totalUsers = computed(() => this.summary()?.users.total ?? 0);
  totalOrders = computed(() => this.summary()?.orders.total ?? 0);
  totalTransactions = computed(() => this.summary()?.transactions.total ?? 0);
  totalVisitors = computed(() => this.summary()?.visitors.total ?? 0);
  totalSales = computed(() => this.summary()?.sales.total ?? 0);
  
  // Growth percentages
  userGrowth = computed(() => {
    const summary = this.summary();
    if (!summary || summary.users.lastMonth === 0) return 0;
    return Math.round(((summary.users.total - summary.users.lastMonth) / summary.users.lastMonth) * 100);
  });
  
  orderGrowth = computed(() => {
    const summary = this.summary();
    if (!summary || summary.orders.lastMonth === 0) return 0;
    return Math.round(((summary.orders.total - summary.orders.lastMonth) / summary.orders.lastMonth) * 100);
  });
  
  transactionGrowth = computed(() => {
    const summary = this.summary();
    if (!summary || summary.transactions.lastMonth === 0) return 0;
    return Math.round(((summary.transactions.total - summary.transactions.lastMonth) / summary.transactions.lastMonth) * 100);
  });
  
  salesGrowth = computed(() => {
    const summary = this.summary();
    if (!summary || summary.sales.lastMonth === 0) return 0;
    return Math.round(((summary.sales.total - summary.sales.lastMonth) / summary.sales.lastMonth) * 100);
  });

  // User chart computed values
  userChartGrowthRate = computed(() => {
    const data = this.usersChartRawData();
    if (data.length < 2) return 0;
    const first = data[0].count;
    const last = data[data.length - 1].count;
    if (first === 0) return 0;
    return Math.round(((last - first) / first) * 100);
  });

  // Revenue chart computed values
  revenueFirstValue = computed(() => {
    const data = this.revenueChartRawData();
    return data.length > 0 ? data[0].count : 0;
  });

  revenueLastValue = computed(() => {
    const data = this.revenueChartRawData();
    return data.length > 0 ? data[data.length - 1].count : 0;
  });

  revenueGrowthRate = computed(() => {
    const data = this.revenueChartRawData();
    if (data.length < 2) return 0;
    const first = data[0].count;
    const last = data[data.length - 1].count;
    if (first === 0) return 0;
    return Math.round(((last - first) / first) * 100);
  });

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.isLoading.set(true);
    
    // Load summary data
    this.dashService.getSummary().subscribe({
      next: (data) => this.summary.set(data),
      error: (err) => console.error('Error loading summary:', err)
    });

    // Load last orders
    this.dashService.getLastOrders(3).subscribe({
      next: (data) => this.lastOrders.set(data),
      error: (err) => console.error('Error loading orders:', err)
    });

    // Load last users
    this.dashService.getLastUsers(3).subscribe({
      next: (data) => this.lastUsers.set(data),
      error: (err) => console.error('Error loading users:', err)
    });

    // Load chart data
    this.loadChartData(this.selectedPeriod());
  }

  loadChartData(period: Period) {
    this.selectedPeriod.set(period);

    // Load users chart
    this.dashService.getUsersChart(period).subscribe({
      next: (data) => {
        this.usersChartRawData.set(data);
        this.updateUserGrowthChart(data);
      },
      error: (err) => console.error('Error loading users chart:', err),
      complete: () => this.isLoading.set(false)
    });

    // Load revenue/transactions chart
    this.dashService.getTransactionsChart(period).subscribe({
      next: (data) => {
        this.revenueChartRawData.set(data);
        this.updateRevenueChart(data);
      },
      error: (err) => console.error('Error loading revenue chart:', err)
    });
  }

  onPeriodChange(period: Period) {
    this.loadChartData(period);
  }

  refreshData() {
    this.loadDashboardData();
  }

  updateUserGrowthChart(data: TimeSeriesPointDto[]) {
    const labels = data.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const values = data.map(d => d.count);
    
    // Calculate cumulative values for total users
    const cumulativeValues: number[] = [];
    let sum = 0;
    values.forEach(v => {
      sum += v;
      cumulativeValues.push(sum);
    });

    // Active users (approximate as 70% of total)
    const activeValues = cumulativeValues.map(v => Math.floor(v * 0.7));

    this.userGrowthChartDataDisplay = {
      labels,
      datasets: [
        {
          data: cumulativeValues,
          label: 'Total Users',
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: 'rgb(59, 130, 246)',
          pointHoverBorderWidth: 2
        },
        {
          data: activeValues,
          label: 'Active Users',
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: 'rgb(16, 185, 129)',
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: 'rgb(16, 185, 129)',
          pointHoverBorderWidth: 2
        }
      ]
    };
  }

  updateRevenueChart(data: TimeSeriesPointDto[]) {
    const labels = data.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const values = data.map(d => d.count);

    this.revenueChartDataDisplay = {
      labels,
      datasets: [
        {
          data: values,
          label: 'Revenue',
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
          hoverBackgroundColor: 'rgba(16, 185, 129, 0.9)',
          hoverBorderColor: 'rgb(16, 185, 129)',
          hoverBorderWidth: 2
        }
      ]
    };
  }

  getOrderStatusBadgeClass(status: number): string {
    switch (status) {
      case 0: return 'badge-warning';  // Pending
      case 1: return 'badge-info';     // Processing
      case 2: return 'badge-primary';  // Shipped
      case 3: return 'badge-success';  // Delivered
      case 4: return 'badge-error';    // Cancelled
      default: return 'badge-ghost';
    }
  }

  getOrderStatusText(status: number): string {
    switch (status) {
      case 0: return 'Pending';
      case 1: return 'Processing';
      case 2: return 'Shipped';
      case 3: return 'Delivered';
      case 4: return 'Cancelled';
      default: return 'Unknown';
    }
  }

  getTimeAgo(date: string): string {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    }
  }
  // User Growth Chart
  public userGrowthChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        padding: 12
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.05)'
        },
        ticks: {
          color: 'rgba(0,0,0,0.6)',
          font: {
            size: 11
          },
          padding: 8
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(0,0,0,0.6)',
          font: {
            size: 11
          },
          padding: 8
        }
      }
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
        borderWidth: 2
      },
      line: {
        borderWidth: 3
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart'
    }
  };

  public userGrowthChartDataDisplay: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Total Users',
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#ffffff',
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: 'rgb(59, 130, 246)',
        pointHoverBorderWidth: 2
      },
      {
        data: [],
        label: 'Active Users',
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#ffffff',
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: 'rgb(16, 185, 129)',
        pointHoverBorderWidth: 2
      }
    ]
  };

  public userGrowthChartType: ChartType = 'line';

  // Job Categories Chart
  public jobCategoriesChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        padding: 12,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const dataArray = context.dataset.data as number[];
            const total = dataArray.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart'
    },
    cutout: '60%'
  };

  public jobCategoriesChartData: ChartData<'doughnut'> = {
    labels: ['Web Development', 'Graphic Design', 'Content Writing', 'Digital Marketing', 'Data Entry', 'Other'],
    datasets: [
      {
        data: [45, 32, 28, 19, 15, 12],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(107, 114, 128, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgb(139, 92, 246)',
          'rgb(107, 114, 128)'
        ],
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 4
      }
    ]
  };

  public jobCategoriesChartType: ChartType = 'doughnut';

  // Revenue Chart
  public revenueChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        padding: 12,
        callbacks: {
          label: function(context) {
            const yValue = context.parsed?.y;
            return `Revenue: $${(yValue || 0).toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.05)'
        },
        ticks: {
          color: 'rgba(0,0,0,0.6)',
          font: {
            size: 11
          },
          padding: 8,
          callback: function(value) {
            return '$' + Number(value).toLocaleString();
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(0,0,0,0.6)',
          font: {
            size: 11
          },
          padding: 8
        }
      }
    },
    elements: {
      bar: {
        borderRadius: 4,
        borderSkipped: false
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart'
    }
  };

  public revenueChartDataDisplay: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Revenue',
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
        hoverBackgroundColor: 'rgba(16, 185, 129, 0.9)',
        hoverBorderColor: 'rgb(16, 185, 129)',
        hoverBorderWidth: 2
      }
    ]
  };

  public revenueChartType: ChartType = 'bar';

  // Available periods for selection
  periods: Period[] = ['7d', '30d', '60d', '90d', '180d', '365d', '1y', '2y'];
  displayPeriods: Period[] = ['7d', '30d', '90d', '180d', '1y'];
}
