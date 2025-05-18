// src/app/services/premium.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class PremiumService {
  // Corregido: Usar la ruta /api/premium
  private apiUrl = `${environment.apiUrl}/api/premium`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    console.log('PremiumService inicializado con URL:', this.apiUrl);
  }

  // Añadido: Obtener el token de autenticación
  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Añadido: Configurar los headers con el token
  private getHeaders(): { headers: HttpHeaders } {
    const token = this.getToken();
    return {
      headers: new HttpHeaders()
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${token || ''}`)
    };
  }

  getPremiumStatus(): Observable<any> {
    // Añadido: Usar los headers con autenticación
    return this.http.get(`${this.apiUrl}/status`, this.getHeaders());
  }

  createSubscription(): Observable<any> {
    // Añadido: Usar los headers con autenticación
    return this.http.post(`${this.apiUrl}/subscribe`, {}, this.getHeaders());
  }

  capturePayment(orderId: string): Observable<any> {
    // Añadido: Usar los headers con autenticación
    return this.http.post(`${this.apiUrl}/capture`, { orderId }, this.getHeaders())
      .pipe(
        tap((response: any) => {
          if (response.success) {
            // Actualizar estado premium en el servicio de autenticación
            this.authService.updatePremiumStatus(true, response.premiumExpiry);
          }
        })
      );
  }

  cancelSubscription(): Observable<any> {
    // Añadido: Usar los headers con autenticación
    return this.http.post(`${this.apiUrl}/cancel`, {}, this.getHeaders());
  }
}