import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserSocialService } from '../../services/social.service';
import { SocketService } from '../../services/socket.service';
import { CommonModule } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PremiumService } from '../../services/premium.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  searchForm: FormGroup;
  pendingRequestsCount: number = 0;
  isPremiumUser: boolean = false;
  isMenuOpen: boolean = false;
  isMobileView: boolean = false;

  private socketSubscription?: Subscription;
  private premiumCheckSubscription?: Subscription;
  private socialCheckSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private userSocialService: UserSocialService,
    private socketService: SocketService,
    private premiumService: PremiumService
  ) {
    this.searchForm = this.fb.group({
      query: ['', [Validators.minLength(2)]]
    });

    this.checkScreenSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkScreenSize();
  }

  checkScreenSize() {
    this.isMobileView = window.innerWidth < 992;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  ngOnInit() {
    // Si el usuario está autenticado, verificar solicitudes pendientes y estado premium
    if (this.isAuthenticated()) {
      this.cargarSolicitudesPendientes();
      this.checkPremiumStatus();

      // Verificar solicitudes cada minuto
      this.socialCheckSubscription = interval(60000).pipe(
        switchMap(() => {
          if (this.isAuthenticated()) {
            return this.userSocialService.getPendingFollowRequests();
          }
          return [];
        })
      ).subscribe({
        next: (solicitudes) => {
          this.pendingRequestsCount = solicitudes.length;
        },
        error: (error) => {
          console.error('Error al verificar solicitudes pendientes:', error);
        }
      });

      // Suscribirse a nuevas solicitudes de seguimiento
      this.socketSubscription = this.socketService.newFollowRequest$.subscribe(
        request => {
          if (request) {
            this.pendingRequestsCount++;
            this.mostrarIndicadorNuevaNotificacion();
          }
        }
      );
    }
  }

  ngOnDestroy() {
    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }
    if (this.premiumCheckSubscription) {
      this.premiumCheckSubscription.unsubscribe();
    }
    if (this.socialCheckSubscription) {
      this.socialCheckSubscription.unsubscribe();
    }
  }

  checkPremiumStatus() {
    // Utilizamos tu PremiumService existente
    this.premiumCheckSubscription = this.premiumService.getPremiumStatus().subscribe({
      next: (status) => {
        this.isPremiumUser = status.isPremium;
        console.log('Estado premium del usuario:', this.isPremiumUser);
      },
      error: (error) => {
        console.error('Error al verificar estado premium:', error);
        this.isPremiumUser = false;
      }
    });
  }

  mostrarIndicadorNuevaNotificacion() {
    const notifyBadge = document.querySelector('.notify-badge');
    if (notifyBadge) {
      notifyBadge.classList.add('pulse-animation');
      setTimeout(() => {
        notifyBadge.classList.remove('pulse-animation');
      }, 2000);
    }
  }

  cargarSolicitudesPendientes(): void {
    this.userSocialService.getPendingFollowRequests().subscribe({
      next: (solicitudes) => {
        this.pendingRequestsCount = solicitudes.length;
      },
      error: (error) => {
        console.error('Error al cargar solicitudes pendientes:', error);
      }
    });
  }

  buscar(): void {
    if (this.searchForm.valid && this.searchForm.value.query?.trim()) {
      this.router.navigate(['/buscador-peliculas'], {
        queryParams: { query: this.searchForm.value.query }
      });
      this.searchForm.reset();

      // Cerrar menú móvil si está abierto
      if (this.isMenuOpen && this.isMobileView) {
        this.isMenuOpen = false;
      }
    }
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  getUserAvatarPath(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const avatar = user.avatar || 'avatar1';
    return `/avatares/${avatar}.gif`;
  }

  getUsername(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.username || 'Usuario';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigateTo(route: string) {
    this.router.navigate([route]);

    // Cerrar menú móvil si está abierto
    if (this.isMenuOpen && this.isMobileView) {
      this.isMenuOpen = false;
    }
  }
}