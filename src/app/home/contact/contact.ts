import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class Contact {
  // Form state
  formData = {
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  };

  isSubmitting = signal(false);
  isSubmitted = signal(false);

  // Contact information
  contactInfo = {
    address: 'Damascus, Syria',
    phone: '+963 11 123 4567',
    email: 'info@aljawhara.com',
    workingHours: 'Sunday - Thursday: 9:00 AM - 6:00 PM'
  };

  // Social media links
  socialLinks = [
    { name: 'Facebook', icon: '📘', url: 'https://facebook.com/aljawhara' },
    { name: 'Instagram', icon: '📷', url: 'https://instagram.com/aljawhara' },
    { name: 'Twitter', icon: '🐦', url: 'https://twitter.com/aljawhara' },
    { name: 'LinkedIn', icon: '💼', url: 'https://linkedin.com/company/aljawhara' }
  ];

  onSubmit() {
    this.isSubmitting.set(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log('Form submitted:', this.formData);
      this.isSubmitted.set(true);
      this.isSubmitting.set(false);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        this.formData = {
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: ''
        };
        this.isSubmitted.set(false);
      }, 3000);
    }, 1000);
  }
}

