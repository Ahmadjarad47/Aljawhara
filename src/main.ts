/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Performance: Bootstrap application with error handling
bootstrapApplication(App, appConfig)
  .catch((err) => {
    console.error('Error during application bootstrap:', err);
    // In production, you might want to send this to an error tracking service
  });
