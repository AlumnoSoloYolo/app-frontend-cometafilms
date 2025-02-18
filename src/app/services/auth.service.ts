// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environments';


// Interfaz para tipar la respuesta de autenticación
interface AuthResponse {
    token: string;
    user: {
        id: string;
        username: string;
        email: string;
    };
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    // BehaviorSubject nos permite mantener el estado del usuario y notificar cambios
    public currentUserSubject = new BehaviorSubject<any>(null);
    public currentUser = this.currentUserSubject.asObservable();


    private apiUrl = environment.apiUrl + '/auth';

    constructor(private http: HttpClient) {
        // Al iniciar el servicio, verificamos si hay un usuario guardado
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            this.currentUserSubject.next(JSON.parse(storedUser));
        }
    }


    register(
        username: string,
        email: string,
        password: string,
        avatar: string = 'avatar1'
    ): Observable<AuthResponse> {
        console.log('Enviando datos de registro:', {
            username,
            email,
            avatar
        });

        return this.http.post<AuthResponse>(`${this.apiUrl}/register`, {
            username,
            email,
            password,
            avatar
        }).pipe(
            tap(response => {
                console.log('Respuesta de registro:', response);
                this.handleAuthSuccess(response);
            }),
            catchError(error => {
                console.error('Error completo en registro:', error);
                return throwError(() => error);
            })
        );
    }

    login(email: string, password: string): Observable<AuthResponse> {
        console.log('Intentando login con:', { email, password });

        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, {
            email,
            password
        }).pipe(
            tap(response => {
                console.log('Respuesta del servidor:', response);
                this.handleAuthSuccess(response);
            }),
            catchError(error => {

                console.error('Error completo de inicio de sesión:', error);

                console.log('Detalles del error:', {
                    status: error.status,
                    message: error.error?.message,
                    error: error.error
                });

                if (error.status === 401) {

                    return throwError(() => new Error('INVALID_CREDENTIALS'));
                } else if (error.status === 404) {

                    return throwError(() => new Error('USER_NOT_FOUND'));
                } else {

                    return throwError(() => new Error('SERVER_ERROR'));
                }
            })
        );
    }

    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUserSubject.next(null);
    }


    isAuthenticated(): boolean {
        return !!this.getToken();
    }


    getToken(): string | null {
        return localStorage.getItem('token');
    }

    private handleAuthSuccess(response: any) {
        console.log('Respuesta completa del login:', response);
        if (response) {

            localStorage.setItem('token', response.token);


            const userToStore = {
                id: response.user.id,
                username: response.user.username,
                email: response.user.email,
                avatar: response.user.avatar,
                createdAt: response.user.createdAt,
                pelisPendientes: response.user.pelisPendientes || [],
                pelisVistas: response.user.pelisVistas || [],
                reviews: response.user.reviews || []
            };

            console.log('Usuario a guardar en localStorage:', userToStore);
            localStorage.setItem('user', JSON.stringify(userToStore));
        }
    }
}