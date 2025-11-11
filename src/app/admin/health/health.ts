import { Component, OnInit, inject, signal, effect, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarController,
  LineController,
} from 'chart.js';
import { ServiceHealth } from './service-health';
import { ToastService } from '../../services/toast.service';
import { HealthChartPointDto } from './health.models';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarController,
  LineController
);

@Component({
  selector: 'app-health',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './health.html',
  styleUrl: './health.css'
})
export class Health implements OnInit {
  private healthService = inject(ServiceHealth);
  private toastService = inject(ToastService);
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  isLoading = signal<boolean>(false);
  minutes = signal<number>(60);

  summary$ = this.healthService.summary$;
  chartData = signal<HealthChartPointDto[]>([]);

  // Health Chart Configuration
  public healthChartOptions: ChartConfiguration<'line'>['options'] = {
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
          padding: 8,
          stepSize: 1
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
        radius: 3,
        hoverRadius: 5,
        borderWidth: 2
      },
      line: {
        borderWidth: 3,
        tension: 0.35
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart'
    }
  };

  public healthChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Healthy',
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: 'rgb(16, 185, 129)'
      },
      {
        data: [],
        label: 'Unhealthy',
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: 'rgb(239, 68, 68)'
      }
    ]
  };

  public healthChartType: ChartType = 'line';

  constructor() {
    effect(() => {
      const data = this.chartData();
      this.updateChartData(data);
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.isLoading.set(true);
    this.healthService.getSummary().subscribe({
      next: () => {
        this.loadChart(this.minutes());
      },
      error: (err: unknown) => {
        this.toastService.error('Error', 'Failed to load health summary');
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  loadChart(mins: number) {
    this.healthService.getChart(mins).subscribe({
      next: (data) => {
        this.chartData.set(data);
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        this.toastService.error('Error', 'Failed to load health chart');
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  onMinutesChange(mins: number) {
    this.minutes.set(mins);
    this.isLoading.set(true);
    this.loadChart(mins);
  }

  updateChartData(points: HealthChartPointDto[]) {
    if (!points || points.length === 0) {
      this.healthChartData = {
        ...this.healthChartData,
        labels: [],
        datasets: [
          {
            ...this.healthChartData.datasets[0],
            data: []
          },
          {
            ...this.healthChartData.datasets[1],
            data: []
          }
        ]
      };
      return;
    }

    const labels = points.map(point => {
      const date = new Date(point.date);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    });

    const healthyData = points.map(point => point.healthy);
    const unhealthyData = points.map(point => point.unhealthy);

    this.healthChartData = {
      ...this.healthChartData,
      labels: labels,
      datasets: [
        {
          ...this.healthChartData.datasets[0],
          data: healthyData
        },
        {
          ...this.healthChartData.datasets[1],
          data: unhealthyData
        }
      ]
    };
  }
}
