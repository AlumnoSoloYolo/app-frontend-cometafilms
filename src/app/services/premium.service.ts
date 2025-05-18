// src/app/services/premium.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class PremiumService {
  private apiUrl = `${environment.apiUrl}/premium`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  getPremiumStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/status`);
  }

  createSubscription(): Observable<any> {
    return this.http.post(`${this.apiUrl}/subscribe`, {});
  }

  capturePayment(orderId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/capture`, { orderId })
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
    return this.http.post(`${this.apiUrl}/cancel`, {});
  }
}