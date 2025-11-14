import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-cookie-policy',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cookie-policy.html',
  styleUrl: './cookie-policy.css'
})
export class CookiePolicy {
  lastUpdated = 'January 2024';
}
