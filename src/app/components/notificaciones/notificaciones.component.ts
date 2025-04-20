import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserSocialService } from '../../services/social.service';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notificaciones.component.html',
  styleUrl: './notificaciones.component.css'
})
export class NotificacionesComponent implements OnInit {
  followRequests: any[] = [];
  cargando: boolean = false;
  activeTab: 'solicitudes' | 'notificaciones' = 'solicitudes';

  constructor(private userSocialService: UserSocialService) { }

  ngOnInit(): void {
    this.cargarSolicitudes();
  }

  cargarSolicitudes(): void {
    this.cargando = true;
    this.userSocialService.getPendingFollowRequests().subscribe({
      next: (solicitudes) => {
        this.followRequests = solicitudes;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar solicitudes de seguimiento:', error);
        this.cargando = false;
      }
    });
  }

  aceptarSolicitud(requestId: string): void {
    this.userSocialService.acceptFollowRequest(requestId).subscribe({
      next: () => {
        // Actualizar la lista eliminando la solicitud aceptada
        this.followRequests = this.followRequests.filter(req => req._id !== requestId);
      },
      error: (error) => {
        console.error('Error al aceptar solicitud:', error);
      }
    });
  }

  rechazarSolicitud(requestId: string): void {
    this.userSocialService.rejectFollowRequest(requestId).subscribe({
      next: () => {
        // Actualizar la lista eliminando la solicitud rechazada
        this.followRequests = this.followRequests.filter(req => req._id !== requestId);
      },
      error: (error) => {
        console.error('Error al rechazar solicitud:', error);
      }
    });
  }

  cambiarTab(tab: 'solicitudes' | 'notificaciones'): void {
    this.activeTab = tab;
    if (tab === 'solicitudes') {
      this.cargarSolicitudes();
    }
  }

  getAvatarPath(avatar: string): string {
    return `/avatares/${avatar}.gif`;
  }
}

