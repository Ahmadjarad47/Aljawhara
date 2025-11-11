import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  constructor(private router: Router) {}

  navigateTo(route: string) {
    this.router.navigate([`/user/${route}`]);
  }

  navigateHome() {
    this.router.navigate(['/']);
  }
}
