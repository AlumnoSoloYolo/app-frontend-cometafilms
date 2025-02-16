import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router
} from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const isAuthenticated = this.authService.isAuthenticated();

    if (isAuthenticated) {
      // Si está autenticado, permitir acceso
      return true;
    }

    // Si no está autenticado, redirigir al login
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: state.url }
    });
    return false;
  }
}

@Injectable({
  providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  canActivate() {
    const isAuthenticated = this.authService.isAuthenticated();

    if (!isAuthenticated) {
      // Si no está autenticado, permitir acceso
      return true;
    }

    // Si ya está autenticado, redirigir al perfil
    this.router.navigate(['/perfil']);
    return false;
  }
}