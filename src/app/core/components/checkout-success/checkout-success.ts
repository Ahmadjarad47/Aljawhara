import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './checkout-success.html',
  styleUrl: './checkout-success.css'
})
export class CheckoutSuccessComponent {
  private router = inject(Router);
  
  goHome() {
    this.router.navigate(['/']);
  }
}

