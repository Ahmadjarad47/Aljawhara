import { Component } from '@angular/core';
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
export class About {
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
      description: 'We prioritize our customers\' needs and satisfaction above all else.',
      icon: '❤️'
    },
    {
      title: 'Innovation',
      description: 'Constantly evolving and improving our platform with cutting-edge technology.',
      icon: '💡'
    },
    {
      title: 'Trust & Transparency',
      description: 'Building trust through honest communication and transparent practices.',
      icon: '🤝'
    },
    {
      title: 'Quality',
      description: 'Delivering only the highest quality products and services.',
      icon: '✨'
    }
  ];
}

