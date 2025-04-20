// En header.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserSocialService } from '../../services/social.service';
import { CommonModule } from '@angular/common';
import { interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  searchForm: FormGroup;
  pendingRequestsCount: number = 0;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private userSocialService: UserSocialService
  ) {
    this.searchForm = this.fb.group({
      query: ['', [Validators.minLength(2)]]
    });
  }

  ngOnInit() {
    // Si el usuario está autenticado, verificar solicitudes pendientes
    if (this.isAuthenticated()) {
      this.cargarSolicitudesPendientes();

      // Verificar solicitudes cada minuto
      interval(60000).pipe(
        switchMap(() => {
          // Solo hacer la consulta si el usuario sigue autenticado
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
    if (this.searchForm.value.query?.trim()) {
      this.router.navigate(['/buscador-peliculas'], {
        queryParams: { query: this.searchForm.value.query }
      });
      this.searchForm.reset();
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
}