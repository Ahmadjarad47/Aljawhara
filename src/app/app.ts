import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Navbar } from "./home/navbar/navbar";
import { ServiceAuth } from './auth/service-auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('Aljawhara.new.Angular');
  protected readonly url = inject(Router);
  private readonly authService = inject(ServiceAuth);

  ngOnInit(): void {
    // Initialize authentication state on app startup
    this.authService.autoAuthUser();
  }

  hideNavbar() {
    return true ? this.url.url.includes('admin') || this.url.url.includes('user') : false;
  }
}
