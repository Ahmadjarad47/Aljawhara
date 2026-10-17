import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { MaintenanceService } from '../services/maintenance.service';

export const maintenanceGuard: CanActivateChildFn = () => {
  const router = inject(Router);
  return inject(MaintenanceService).checkAccess().pipe(
    map(allowed => allowed || router.createUrlTree(['/maintenance']))
  );
};

// Keep sign-in and account recovery reachable so administrators can sign in.
export const maintenanceAuthGuard: CanActivateChildFn = (route, state) => {
  if (['', 'login', 'forgot-password', 'reset-password', 'verify'].includes(route.routeConfig?.path ?? '')) {
    return true;
  }
  return maintenanceGuard(route, state);
};

export const maintenancePageGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(MaintenanceService).checkAccess().pipe(
    map(allowed => allowed ? router.createUrlTree(['/']) : true)
  );
};
