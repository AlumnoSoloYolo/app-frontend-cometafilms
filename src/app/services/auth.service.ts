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
    private currentUserSubject = new BehaviorSubject<any>(null);
    public currentUser$ = this.currentUserSubject.asObservable();

    // La URL base de nuestro backend
    private apiUrl = environment.apiUrl + '/auth';

    constructor(private http: HttpClient) {
        // Al iniciar el servicio, verificamos si hay un usuario guardado
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            this.currentUserSubject.next(JSON.parse(storedUser));
        }
    }

    // Método para registrar un nuevo usuario
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
                // Imprime el error completo para diagnóstico
                console.error('Error completo de inicio de sesión:', error);

                // Imprime detalles específicos del error
                console.log('Detalles del error:', {
                    status: error.status,
                    message: error.error?.message,
                    error: error.error
                });

                // Manejo de diferentes tipos de errores
                if (error.status === 401) {
                    // Credenciales incorrectas
                    return throwError(() => new Error('INVALID_CREDENTIALS'));
                } else if (error.status === 404) {
                    // Usuario no encontrado
                    return throwError(() => new Error('USER_NOT_FOUND'));
                } else {
                    // Error genérico del servidor
                    return throwError(() => new Error('SERVER_ERROR'));
                }
            })
        );
    }
    // Método para cerrar sesión
    logout(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.currentUserSubject.next(null);
    }

    // Método para verificar si el usuario está autenticado
    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    // Método para obtener el token actual
    getToken(): string | null {
        return localStorage.getItem('token');
    }

    private handleAuthSuccess(response: any) {
        console.log('Respuesta completa del login:', response);
        if (response) {
            // Guardar el token
            localStorage.setItem('token', response.token);

            // Guardar usuario con toda su información
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