import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class About implements OnInit, OnDestroy {
  private languageCheckInterval?: ReturnType<typeof setInterval>;

  // Language management
  currentLanguage = signal<'ar' | 'en'>('ar');

  // Translations object
  translations = {
    ar: {
      aboutAljawhara: 'من نحن - الجوهرة',
      heroDesc: 'وجهتك الموثوقة التي تربط المشترين والبائعين في جميع أنحاء سوريا',
      ourStory: 'قصتنا',
      ourAchievements: 'إنجازاتنا',
      ourValues: 'قيمنا',
      meetOurTeam: 'تعرف على فريقنا',
      ourMission: 'مهمتنا',
      joinUsToday: 'انضم إلينا اليوم',
      joinUsDesc: 'سواء كنت شركة تبحث عن توسيع نطاق وصولك أو عميل يبحث عن منتجات عالية الجودة، الجوهرة هنا لخدمتك. انضم إلى مجتمعنا المتنامي اليوم!',
      browseProducts: 'تصفح المنتجات',
      contactUs: 'اتصل بنا',
      activeUsers: 'مستخدم نشط',
      productsSold: 'منتج مباع',
      merchants: 'تاجر',
      satisfactionRate: 'معدل الرضا'
    },
    en: {
      aboutAljawhara: 'About Aljawhara',
      heroDesc: 'Your trusted marketplace connecting buyers and sellers across Syria',
      ourStory: 'Our Story',
      ourAchievements: 'Our Achievements',
      ourValues: 'Our Values',
      meetOurTeam: 'Meet Our Team',
      ourMission: 'Our Mission',
      joinUsToday: 'Join Us Today',
      joinUsDesc: 'Whether you\'re a business looking to expand your reach or a customer seeking quality products, Aljawhara is here to serve you. Join our growing community today!',
      browseProducts: 'Browse Products',
      contactUs: 'Contact Us',
      activeUsers: 'Active Users',
      productsSold: 'Products Sold',
      merchants: 'Merchants',
      satisfactionRate: 'Satisfaction Rate'
    }
  };

  t(key: string): string {
    const lang = this.currentLanguage();
    return this.translations[lang][key as keyof typeof this.translations['ar']] || key;
  }

  // Get localized stat label
  getStatLabel(stat: any): string {
    const isArabic = this.currentLanguage() === 'ar';
    const labelMap: { [key: string]: { ar: string; en: string } } = {
      'Active Users': { ar: this.t('activeUsers'), en: 'Active Users' },
      'Products Sold': { ar: this.t('productsSold'), en: 'Products Sold' },
      'Merchants': { ar: this.t('merchants'), en: 'Merchants' },
      'Satisfaction Rate': { ar: this.t('satisfactionRate'), en: 'Satisfaction Rate' }
    };
    return isArabic ? (labelMap[stat.label]?.ar || stat.label) : stat.label;
  }
  // Company stats
  stats = [
    { value: '25000+', label: 'Active Users', icon: '👥' },
    { value: '150000+', label: 'Products Sold', icon: '📦' },
    { value: '1200+', label: 'Merchants', icon: '🏪' },
    { value: '96%', label: 'Satisfaction Rate', icon: '⭐' }
  ];

  // Team members
  team = [
    {
      name: 'John Doe',
      role: 'CEO & Founder',
      image: '/assets/team1.jpg',
      bio: 'Visionary leader with 15+ years in e-commerce'
    },
    {
      name: 'Jane Smith',
      role: 'CTO',
      image: '/assets/team2.jpg',
      bio: 'Tech enthusiast focused on innovation'
    },
    {
      name: 'Mike Johnson',
      role: 'Head of Operations',
      image: '/assets/team3.jpg',
      bio: 'Ensuring smooth operations and customer satisfaction'
    }
  ];

  // Values
  values = [
    {
      title: 'Customer First',
      titleAr: 'العميل أولاً',
      description: 'We prioritize our customers\' needs and satisfaction above all else.',
      descriptionAr: 'نحن نعطي الأولوية لاحتياجات عملائنا ورضاهم فوق كل شيء.',
      icon: '❤️'
    },
    {
      title: 'Innovation',
      titleAr: 'الابتكار',
      description: 'Constantly evolving and improving our platform with cutting-edge technology.',
      descriptionAr: 'نطور ونحسن منصتنا باستمرار باستخدام أحدث التقنيات.',
      icon: '💡'
    },
    {
      title: 'Trust & Transparency',
      titleAr: 'الثقة والشفافية',
      description: 'Building trust through honest communication and transparent practices.',
      descriptionAr: 'بناء الثقة من خلال التواصل الصادق والممارسات الشفافة.',
      icon: '🤝'
    },
    {
      title: 'Quality',
      titleAr: 'الجودة',
      description: 'Delivering only the highest quality products and services.',
      descriptionAr: 'نقدم فقط أعلى جودة من المنتجات والخدمات.',
      icon: '✨'
    }
  ];

  // Get localized value title and description
  getValueTitle(value: any): string {
    return this.currentLanguage() === 'ar' ? (value.titleAr || value.title) : value.title;
  }

  getValueDescription(value: any): string {
    return this.currentLanguage() === 'ar' ? (value.descriptionAr || value.description) : value.description;
  }

  ngOnInit() {
    const savedLang = localStorage.getItem('language') as 'ar' | 'en' | null;
    if (savedLang && (savedLang === 'ar' || savedLang === 'en')) {
      this.currentLanguage.set(savedLang);
    } else {
      this.currentLanguage.set('ar');
    }

    window.addEventListener('storage', (e) => {
      if (e.key === 'language' && e.newValue) {
        const newLang = e.newValue as 'ar' | 'en';
        if (newLang === 'ar' || newLang === 'en') {
          this.currentLanguage.set(newLang);
        }
      }
    });

    this.languageCheckInterval = setInterval(() => {
      const currentLang = localStorage.getItem('language') as 'ar' | 'en' | null;
      if (currentLang && (currentLang === 'ar' || currentLang === 'en') && currentLang !== this.currentLanguage()) {
        this.currentLanguage.set(currentLang);
      }
    }, 500);
  }

  ngOnDestroy() {
    if (this.languageCheckInterval) {
      clearInterval(this.languageCheckInterval);
    }
  }
}

