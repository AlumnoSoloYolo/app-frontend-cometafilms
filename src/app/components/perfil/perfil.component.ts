import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { UserMovieService } from '../../services/user.service';
import { PeliculasService } from '../../services/peliculas.service';
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

  constructor(
    private userMovieService: UserMovieService,
    private movieService: PeliculasService,

  ) { }

  ngOnInit() {
    this.loadUserProfile();
    this.loadReviews();
  }

  loadUserProfile() {
    this.userMovieService.getUserPerfil().subscribe({
      next: (userData) => {
        console.log('Datos recibidos del servidor:', userData);

        this.userProfile = {
          username: userData.username,
          email: userData.email,
          avatar: userData.avatar || 'avatar1',
          createdAt: new Date(userData.createdAt),
          pelisPendientes: userData.pelisPendientes || [],
          pelisVistas: userData.pelisVistas || [],
          reviews: userData.reviews || [],
        };

        localStorage.setItem('user', JSON.stringify(userData));

        if (this.userProfile.pelisPendientes.length > 0) {
          this.loadPeliculasPendientes();
        }

        if (this.userProfile.pelisVistas.length > 0) {
          this.loadPeliculasVistas();
        }
      },
      error: (error) => {
        console.error('Error al cargar datos del servidor:', error);

        const storedUser = localStorage.getItem('user');

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          this.userProfile = {
            username: parsedUser.username,
            email: parsedUser.email,
            avatar: parsedUser.avatar || 'avatar1',
            createdAt: parsedUser.createdAt ? new Date(parsedUser.createdAt) : new Date(),
            pelisPendientes: parsedUser.pelisPendientes || [],
            pelisVistas: parsedUser.pelisVistas || [],
            reviews: parsedUser.reviews || []
          };

          if (this.userProfile.pelisPendientes.length > 0) {
            this.loadPeliculasPendientes();
          }

          if (this.userProfile.pelisVistas.length > 0) {
            this.loadPeliculasVistas();
          }
        }
      }
    });
  }

  loadPeliculasPendientes() {
    const pendientesIds = JSON.parse(localStorage.getItem('peliculasPendientes') || '[]');
    const vistasIds = JSON.parse(localStorage.getItem('peliculasVistas') || '[]');

    // Eliminar IDs que estén en ambas listas
    const uniquePendientesIds = pendientesIds.filter((id: string) => !vistasIds.includes(id));
    localStorage.setItem('peliculasPendientes', JSON.stringify(uniquePendientesIds));

    this.peliculasPendientes = [];
    uniquePendientesIds.forEach((movieId: any) => {
      this.movieService.getDetallesPelicula(movieId).subscribe({
        next: (movie) => {
          this.peliculasPendientes.push(movie);

        },
        error: (error) => {
          console.error('Error al cargar detalles de película pendiente:', error);
        }
      });
    });
  }

  loadPeliculasVistas() {
    const vistasIds = JSON.parse(localStorage.getItem('peliculasVistas') || '[]');
    const pendientesIds = JSON.parse(localStorage.getItem('peliculasPendientes') || '[]');

    // Eliminar IDs que estén en ambas listas
    const uniqueVistasIds = vistasIds.filter((id: string) => !pendientesIds.includes(id));
    localStorage.setItem('peliculasVistas', JSON.stringify(uniqueVistasIds));

    this.peliculasVistas = [];
    uniqueVistasIds.forEach((movieId: any) => {
      this.movieService.getDetallesPelicula(movieId).subscribe({
        next: (movie) => {
          this.peliculasVistas.push(movie);

        },
        error: (error) => {
          console.error('Error al cargar detalles de película vista:', error);
        }
      });
    });
  }

  loadReviews() {
    this.userMovieService.getReviewsUsuario().subscribe({
      next: (reviews) => {
        this.reviews = reviews;
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
      },
      error: (error) => {
        console.error('Error al cargar las reseñas del usuario:', error);
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
      // Verificar si la película ya está en la lista de "Vistas"
      const peliculaYaExiste = this.userProfile.pelisVistas.some(
        (peli) => peli.movieId === movieId
      );

      // Verificar también en la lista local de películas vistas
      const peliculaYaEnListaLocal = this.peliculasVistas.some(
        (peli) => peli.id.toString() === movieId
      );

      if (!peliculaYaExiste && !peliculaYaEnListaLocal) {
        // Agregar la película a la lista de "Vistas"
        this.userProfile.pelisVistas.push({
          movieId: movieId,
          watchedAt: new Date()
        });

        // Eliminar la película de "Pendientes" si está allí
        this.userProfile.pelisPendientes = this.userProfile.pelisPendientes.filter(
          (peli) => peli.movieId !== movieId
        );

        // Guardar cambios en localStorage
        localStorage.setItem('user', JSON.stringify(this.userProfile));

        // Actualizar la UI
        this.movieService.getDetallesPelicula(movieId).subscribe({
          next: (movie) => {
            // Verificar si la película ya está en la lista antes de agregarla
            const peliculaYaEnLista = this.peliculasVistas.some(
              (peli) => peli.id.toString() === movieId
            );

            if (!peliculaYaEnLista) {
              this.peliculasVistas.push(movie);
            }

            // Eliminar la película de "Pendientes"
            this.peliculasPendientes = this.peliculasPendientes.filter(
              (peli) => peli.id.toString() !== movieId
            );


          },
          error: (error) => {
            console.error('Error al cargar detalles de película vista:', error);
          }
        });
      }
    }
  }

  onPeliculaVistaEliminada(movieId: string) {
    if (this.userProfile) {
      // Eliminar la película de la lista de "Vistas"
      this.userProfile.pelisVistas = this.userProfile.pelisVistas.filter(
        (peli) => peli.movieId !== movieId
      );

      // Guardar cambios en localStorage
      localStorage.setItem('user', JSON.stringify(this.userProfile));

      // Actualizar la UI eliminando la película de la lista de "Vistas"
      this.peliculasVistas = this.peliculasVistas.filter(
        (peli) => peli.id.toString() !== movieId
      );

      // Forzar la detección de cambios

    }
  }

  onPeliculaPendienteAgregada(movieId: string) {
    if (this.userProfile) {
      // Verificar si la película ya está en la lista de "Pendientes"
      const peliculaYaExiste = this.userProfile.pelisPendientes.some(
        (peli) => peli.movieId === movieId
      );

      // Verificar también en la lista local de películas pendientes
      const peliculaYaEnListaLocal = this.peliculasPendientes.some(
        (peli) => peli.id.toString() === movieId
      );

      if (!peliculaYaExiste && !peliculaYaEnListaLocal) {
        // Agregar la película a la lista de "Pendientes"
        this.userProfile.pelisPendientes.push({
          movieId: movieId,
          addedAt: new Date()
        });

        // Eliminar la película de "Vistas" si está allí
        this.userProfile.pelisVistas = this.userProfile.pelisVistas.filter(
          (peli) => peli.movieId !== movieId
        );

        // Guardar cambios en localStorage
        localStorage.setItem('user', JSON.stringify(this.userProfile));

        // Actualizar la UI
        this.movieService.getDetallesPelicula(movieId).subscribe({
          next: (movie) => {
            // Verificar si la película ya está en la lista antes de agregarla
            const peliculaYaEnLista = this.peliculasPendientes.some(
              (peli) => peli.id.toString() === movieId
            );

            if (!peliculaYaEnLista) {
              this.peliculasPendientes.push(movie);
            }

            // Eliminar la película de "Vistas"
            this.peliculasVistas = this.peliculasVistas.filter(
              (peli) => peli.id.toString() !== movieId
            );


          },
          error: (error) => {
            console.error('Error al cargar detalles de película pendiente:', error);
          }
        });
      }
    }
  }

  onPeliculaPendienteEliminada(movieId: string) {
    if (this.userProfile) {
      // Eliminar la película de la lista de "Pendientes"
      this.userProfile.pelisPendientes = this.userProfile.pelisPendientes.filter(
        (peli) => peli.movieId !== movieId
      );

      // Guardar cambios en localStorage
      localStorage.setItem('user', JSON.stringify(this.userProfile));

      // Actualizar la UI eliminando la película de la lista de "Pendientes"
      this.peliculasPendientes = this.peliculasPendientes.filter(
        (peli) => peli.id.toString() !== movieId
      );

      // Forzar la detección de cambios

    }
  }


  scrollSection(sectionId: string, direction: 'left' | 'right'): void {
    const container = document.getElementById(sectionId);
    if (!container) return;

    const scrollContent = container.querySelector('.movie-scroll-content') as HTMLElement;
    if (!scrollContent) return;

    const itemWidth = scrollContent.querySelector('.movie-scroll-item')?.clientWidth || 300;
    const scrollAmount = itemWidth * 2;
    const currentScroll = scrollContent.scrollLeft;
    const totalWidth = scrollContent.scrollWidth;
    const visibleWidth = scrollContent.clientWidth;

    let newScroll = direction === 'right'
      ? Math.min(currentScroll + scrollAmount, totalWidth - visibleWidth)
      : Math.max(currentScroll - scrollAmount, 0);

    scrollContent.scrollTo({
      left: newScroll,
      behavior: 'smooth'
    });
  }
}