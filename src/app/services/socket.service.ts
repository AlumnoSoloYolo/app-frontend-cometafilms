import { Injectable } from '@angular/core';
import { environment } from '../../environments/environments';
import { AuthService } from './auth.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private connected = false;
  private newActivitySubject = new BehaviorSubject<any>(null);
  private newFollowRequestSubject = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService) {
    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  private connect(): void {
    if (this.connected) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.error('No hay token disponible para conectar a Socket.IO');
      return;
    }

    this.socket = io(environment.apiUrl, {
      auth: {
        token: token
      }
    });

    this.socket.on('connect', () => {
      console.log('Socket.IO: Conectado');
      this.connected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Socket.IO: Desconectado');
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO: Error de conexión', error);
      this.connected = false;
    });

    // Escuchar nuevas actividades
    this.socket.on('new_activity', (activity) => {
      console.log('Socket.IO: Nueva actividad recibida', activity);
      this.newActivitySubject.next(activity);
    });

    // Escuchar nuevas solicitudes de seguimiento
    this.socket.on('follow_request', (request) => {
      console.log('Socket.IO: Nueva solicitud de seguimiento recibida', request);
      this.newFollowRequestSubject.next(request);

      // Opcional: Mostrar una notificación del navegador
      this.showBrowserNotification(
        'Nueva solicitud de seguimiento',
        `${request.requester.username} quiere seguirte`
      );
    });
  }

  private disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
  }

  // Mostrar notificación del navegador (opcional)
  private showBrowserNotification(title: string, body: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      });
    }
  }

  // Observable para escuchar nuevas actividades
  get newActivity$(): Observable<any> {
    return this.newActivitySubject.asObservable();
  }

  // Observable para escuchar nuevas solicitudes de seguimiento
  get newFollowRequest$(): Observable<any> {
    return this.newFollowRequestSubject.asObservable();
  }

  isConnected(): boolean {
    return this.connected;
  }
}