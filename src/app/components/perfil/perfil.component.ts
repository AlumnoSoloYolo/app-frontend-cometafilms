// perfil.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';

import { UserMovieService } from '../../services/user.service';
import { PeliculasService } from '../../services/peliculas.service';
import { UserSocialService } from '../../services/social.service';
import { AuthService } from '../../services/auth.service';
import { VotoColorPipe } from '../../shared/pipes/voto-color.pipe';
import { PeliculaCardComponent } from '../pelicula-card/pelicula-card.component';

interface UserProfile {
  username: string;
  email: string;
  avatar: string;
  createdAt: Date;
  pelisPendientes: Array<{ movieId: string, addedAt: Date }>;
  pelisVistas: Array<{ movieId: string, watchedAt: Date }>;
  reviews: Review[];
}

interface Review {
  reviewId?: string;
  movieId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  username?: string;
  avatar?: string;
  userId?: string;
  _id?: string;
  movieTitle?: string;
  moviePosterPath?: string;
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, RouterModule, VotoColorPipe, PeliculaCardComponent],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  userProfile: UserProfile | null = null;
  peliculasPendientes: any[] = [];
  peliculasVistas: any[] = [];
  reviews: Review[] = [];
  isOwnProfile: boolean = true;
  isFollowing: boolean = false;

  constructor(
    private userMovieService: UserMovieService,
    private movieService: PeliculasService,
    private userSocialService: UserSocialService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const userId = params['id'];

      if (userId) {
        // Estamos en la ruta /usuarios/:id
        this.authService.currentUser.subscribe(currentUser => {
          this.isOwnProfile = currentUser && currentUser.id === userId;

          if (this.isOwnProfile) {
            // Es nuestro propio perfil
            this.loadUserProfile();
          } else {
            // Es perfil de otro usuario
            this.loadOtherUserProfile(userId);
          }
        });
      } else {
        // Estamos en la ruta /perfil
        this.isOwnProfile = true;
        this.loadUserProfile();
      }
    });
  }

  loadUserProfile() {
    this.userMovieService.getUserPerfil().subscribe({
      next: (userData) => {
        this.userProfile = {
          username: userData.username,
          email: userData.email,
          avatar: userData.avatar || 'avatar1',
          createdAt: new Date(userData.createdAt),
          pelisPendientes: userData.pelisPendientes || [],
          pelisVistas: userData.pelisVistas || [],
          reviews: userData.reviews || [],
        };

        this.isFollowing = userData.ifFollowing || false;

        if (this.userProfile.pelisPendientes.length > 0) {
          this.loadPeliculasPendientes();
        }

        if (this.userProfile.pelisVistas.length > 0) {
          this.loadPeliculasVistas();
        }

        this.loadReviews();
      },
      error: (error) => {
        console.error('Error al cargar datos del servidor:', error);
      }
    });
  }

  loadOtherUserProfile(userId: string) {
    this.userSocialService.getUserProfile(userId).subscribe({
      next: (userData: any) => {
        this.userProfile = {
          username: userData.username,
          email: userData.email || '',
          avatar: userData.avatar || 'avatar1',
          createdAt: new Date(userData.createdAt),
          pelisPendientes: userData.pelisPendientes || [],
          pelisVistas: userData.pelisVistas || [],
          reviews: userData.reviews || [],
        };

        if (this.userProfile.pelisPendientes.length > 0) {
          this.loadPeliculasPendientes();
        }

        if (this.userProfile.pelisVistas.length > 0) {
          this.loadPeliculasVistas();
        }

        this.loadReviews();
      },
      error: (error: any) => {
        console.error('Error al cargar datos del usuario:', error);
      }
    });
  }

  loadPeliculasPendientes() {
    if (!this.userProfile || !this.userProfile.pelisPendientes) return;

    this.peliculasPendientes = [];

    this.userProfile.pelisPendientes.forEach(peli => {
      this.movieService.getDetallesPelicula(peli.movieId).subscribe({
        next: (movie) => {
          this.peliculasPendientes.push(movie);
        },
        error: (error) => console.error('Error al cargar detalles de película pendiente:', error)
      });
    });
  }

  loadPeliculasVistas() {
    if (!this.userProfile || !this.userProfile.pelisVistas) return;

    this.peliculasVistas = [];

    this.userProfile.pelisVistas.forEach(peli => {
      this.movieService.getDetallesPelicula(peli.movieId).subscribe({
        next: (movie) => {
          this.peliculasVistas.push(movie);
        },
        error: (error) => console.error('Error al cargar detalles de película vista:', error)
      });
    });
  }

  loadReviews() {
    if (!this.userProfile || !this.userProfile.reviews) return;

    this.reviews = this.userProfile.reviews;

    this.reviews.forEach(review => {
      if (review.movieId) {
        this.movieService.getDetallesPelicula(review.movieId).subscribe({
          next: (movie) => {
            review.movieTitle = movie.title;
            review.moviePosterPath = `https://image.tmdb.org/t/p/w200${movie.poster_path}`;
          },
          error: (error) => {
            console.error('Error al cargar los detalles de la película:', error);
          }
        });
      }
    });
  }

  getAvatarPath(): string {
    return `/avatares/${this.userProfile?.avatar}.gif`;
  }

  getPendientesCount(): number {
    return this.userProfile?.pelisPendientes.length || 0;
  }

  getVistasCount(): number {
    return this.userProfile?.pelisVistas.length || 0;
  }

  getReviewsCount(): number {
    return this.userProfile?.reviews.length || 0;
  }

  onPeliculaVistaAgregada(movieId: string) {
    if (this.userProfile) {
      this.userProfile.pelisVistas = [...this.userProfile.pelisVistas, { movieId, watchedAt: new Date() }];
      this.userProfile.pelisPendientes = this.userProfile.pelisPendientes.filter(peli => peli.movieId !== movieId);

      this.movieService.getDetallesPelicula(movieId).subscribe({
        next: (movie) => {
          this.peliculasVistas = [...this.peliculasVistas, movie];
          this.peliculasPendientes = this.peliculasPendientes.filter(peli => peli.id.toString() !== movieId);
        },
        error: (error) => console.error('Error al cargar detalles de película vista:', error)
      });
    }
  }

  onPeliculaPendienteAgregada(movieId: string) {
    if (this.userProfile) {
      this.userProfile.pelisPendientes = [...this.userProfile.pelisPendientes, { movieId, addedAt: new Date() }];
      this.userProfile.pelisVistas = this.userProfile.pelisVistas.filter(peli => peli.movieId !== movieId);

      this.movieService.getDetallesPelicula(movieId).subscribe({
        next: (movie) => {
          this.peliculasVistas = this.peliculasVistas.filter(peli => peli.id.toString() !== movieId);

          if (!this.peliculasPendientes.some(peli => peli.id.toString() === movieId)) {
            this.peliculasPendientes = [...this.peliculasPendientes, movie];
          }
        },
        error: (error) => console.error('Error al cargar detalles de película pendiente:', error)
      });
    }
  }

  onPeliculaVistaEliminada(movieId: string) {
    if (this.userProfile) {
      this.userProfile.pelisVistas = this.userProfile.pelisVistas.filter(peli => peli.movieId !== movieId);
      this.peliculasVistas = this.peliculasVistas.filter(peli => peli.id.toString() !== movieId);
    }
  }

  onPeliculaPendienteEliminada(movieId: string) {
    if (this.userProfile) {
      this.userProfile.pelisPendientes = this.userProfile.pelisPendientes.filter(peli => peli.movieId !== movieId);
      this.peliculasPendientes = this.peliculasPendientes.filter(peli => peli.id.toString() !== movieId);
    }
  }

  scrollSection(sectionId: string, direction: 'left' | 'right'): void {
    const container = document.getElementById(sectionId);
    if (!container) return;

    const scrollContenido = container.querySelector('.movie-scroll-content');
    if (!scrollContenido) return;

    const itemAncho = scrollContenido.querySelector('.movie-scroll-item')?.clientWidth || 300;
    const scrollCantidad = itemAncho * 2;
    const scrollActual = scrollContenido.scrollLeft;

    let newScroll = direction === 'right'
      ? scrollActual + scrollCantidad
      : scrollActual - scrollCantidad;

    scrollContenido.scrollTo({
      left: newScroll,
      behavior: 'smooth'
    });
  }


  navigateReview(review: any): void {
    console.log('Navegando a review con ID:', review._id);
    if (review && review._id) {
      this.router.navigate(['/resenia', review._id]);
    }
  }

  toggleFollow(): void {
    const userId = this.route.snapshot.paramMap.get('id');

    if (!userId) return;

    if (this.isFollowing) {
      // Dejar de seguir
      this.userSocialService.unfollowUser(userId).subscribe({
        next: () => {
          this.isFollowing = false;
        },
        error: (error) => {
          console.error('Error al dejar de seguir:', error);
        }
      });
    } else {
      // Seguir
      this.userSocialService.followUser(userId).subscribe({
        next: () => {
          this.isFollowing = true;
        },
        error: (error) => {
          console.error('Error al seguir:', error);
        }
      });
    }
  }
}