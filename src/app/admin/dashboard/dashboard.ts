import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { ServiceAuth } from '../../auth/service-auth';
import { UserResponseDto } from '../../auth/auth.models';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {
  currentUser: UserResponseDto | null = null;
  private destroy$ = new Subject<void>();
  isLoggingOut = false;

  constructor(
    private authService: ServiceAuth,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to current user observable
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });
  }

  logout(): void {
    if (this.isLoggingOut) return;
    
    this.isLoggingOut = true;
    this.authService.logout().subscribe({
      next: (response) => {
        console.log('Logout successful:', response);
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Navigate to login even if API call fails (local data is already cleared)
        this.router.navigate(['/auth/login']);
      },
      complete: () => {
        this.isLoggingOut = false;
      }
    });
  }

  getUserInitials(): string {
    if (!this.currentUser) return 'A';
    
    const username = this.currentUser.username || '';
    
    if (username.length >= 2) {
      return username.substring(0, 2).toUpperCase();
    } else if (username.length === 1) {
      return username.charAt(0).toUpperCase();
    } else if (this.currentUser.email) {
      return this.currentUser.email.charAt(0).toUpperCase();
    }
    
    return 'A';
  }

  getUserDisplayName(): string {
    if (!this.currentUser) return 'Admin User';
    
    if (this.currentUser.username) {
      return this.currentUser.username;
    } else if (this.currentUser.email) {
      return this.currentUser.email;
    }
    
    return 'Admin User';
  }

  getUserRole(): string {
    // Since UserResponseDto doesn't have a role field,
    // we'll display based on the route or default to Administrator
    // This can be updated when role information is available
    return 'Administrator';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
