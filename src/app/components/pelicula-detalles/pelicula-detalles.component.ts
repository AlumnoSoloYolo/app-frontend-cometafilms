import { Component, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VotoColorPipe } from '../../shared/pipes/voto-color.pipe';
import { PeliculasService } from '../../services/peliculas.service';
import { UserMovieService } from '../../services/user.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PeliculaCardComponent } from '../pelicula-card/pelicula-card.component';

@Component({
  selector: 'app-pelicula-detalles',
  standalone: true,
  imports: [
    RouterModule,
    VotoColorPipe,
    CommonModule,
    ReactiveFormsModule,
    PeliculaCardComponent
  ],
  templateUrl: './pelicula-detalles.component.html',
  styleUrl: './pelicula-detalles.component.css'
})
export class PeliculaDetallesComponent implements OnInit {
  pelicula: any;
  trailerUrl: SafeResourceUrl | null = null;
  reviews: any[] = [];
  mostrarFormularioReview = false;
  reviewUsuarioActual: any = null;
  cargandoReviews = false;
  reviewForm: FormGroup;

  constructor(
    private router: ActivatedRoute,
    private pelisService: PeliculasService,
    private userMovieService: UserMovieService,
    private sanitizer: DomSanitizer,
    private fb: FormBuilder,
  ) {
    window.scrollTo({
      top: -100,
      left: 0,
      behavior: 'smooth'
    });
    this.reviewForm = this.fb.group({
      rating: [0, [Validators.required, Validators.min(1), Validators.max(10)]],
      comment: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
    });
  }



  ngOnInit(): void {
    this.router.params.subscribe(params => {
      const id = params['id'];
      this.cargarDetallesPelicula(id);
      this.cargarReviews(id);
      window.scrollTo({
        top: -100,
        left: 0,
        behavior: 'smooth'
      });
    });
  }

  cargarDetallesPelicula(id: string): void {
    this.pelisService.getDetallesPelicula(id).subscribe({
      next: (data) => {
        this.pelicula = data;
        const trailerKey = this.getTrailerClave(this.pelicula.videos.results);
        if (trailerKey) {
          this.trailerUrl = this.getVideoUrl(trailerKey);
        }

        this.cargarReviews(id);
      },
      error: (error) => {
        console.error("Error al cargar los detalles de la película", error)
      }
    });
  }

  getTrailerClave(videos: any[]): string {
    const trailer = videos.find(video => video.type === 'Trailer' && video.site === 'YouTube');
    return trailer.key;
  }

  getVideoUrl(key: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${key}`
    );
  }

  getDirector(): any {
    return this.pelicula.credits.crew.find((person: any) => person.job === 'Director');
  }

  getAvatarPath(avatarName: string): string {
    return `/avatares/${avatarName}.gif`;
  }

  scrollSection(sectionId: string, direction: 'left' | 'right'): void {
    const container = document.getElementById(sectionId);
    if (!container) return;

    const scrollContent = container.querySelector('.movie-scroll-content');
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


  cargarReviews(movieId: string): void {
    this.cargandoReviews = true;

    // Reseñas de TMDB
    const tmdbReviews = this.pelicula.reviews.results.map((review: any) => ({
      _id: review.id,
      movieId: this.pelicula.id,
      username: review.author_details.username || 'Usuario Anónimo',
      avatar: this.getAvatarPath("avatar4"), // Usar el avatar de TMDB o uno por defecto
      rating: review.author_details.rating,
      comment: review.content,
      createdAt: new Date(review.created_at),
      isExternal: true
    }));

    // Reseñas de la base de datos
    this.userMovieService.getReviewsPelicula(movieId).subscribe({
      next: (data) => {
        // Añadir el avatar a las reseñas de la base de datos
        const userReviews = data.reviews.map((review: any) => ({
          ...review,
          avatar: this.getAvatarPath(review.avatar || 'avatar5')
        }));

        // Combinar reseñas de TMDB y la base de datos
        this.reviews = [...tmdbReviews, ...userReviews];

        // Ordenar reseñas por fecha (más reciente primero)
        this.reviews.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Cargar la reseña del usuario actual
        this.userMovieService.getReviewsUsuario().subscribe({
          next: (userReviews) => {
            this.reviewUsuarioActual = userReviews.find(r => r.movieId === movieId);
            this.cargandoReviews = false;
          },
          error: (error) => {
            console.error('Error al cargar review del usuario:', error);
            this.cargandoReviews = false;
          }
        });
      },
      error: (error) => {
        // Si hay un error al cargar las reseñas de la base de datos, usar solo las de TMDB
        this.reviews = tmdbReviews;
        console.error('Error al cargar reviews:', error);
        this.cargandoReviews = false;
      }
    });
  }

  submitReview(): void {
    if (this.reviewForm.invalid) {
      Object.keys(this.reviewForm.controls).forEach(key => {
        const control = this.reviewForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    const reviewData = this.reviewForm.value;

    if (this.reviewUsuarioActual) {
      // Actualizar la reseña existente
      this.userMovieService.updateReview(this.pelicula.id, reviewData).subscribe({
        next: (updatedReviewResponse) => {
          console.log('Respuesta de actualización:', updatedReviewResponse);

          // Acceder a la reseña actualizada
          const updatedReview = updatedReviewResponse.review;

          // Reemplazar la reseña antigua con la reseña actualizada en el array `reviews`
          const index = this.reviews.findIndex(r => r._id === updatedReview._id);
          if (index !== -1) {
            this.reviews[index] = updatedReview; // Reemplazar la reseña existente
          } else {
            this.reviews.unshift(updatedReview); // Agregar la reseña si no existe
          }

          this.cargarReviews(this.pelicula.id);
          window.location.reload()

          // Cerrar el formulario y resetear
          this.mostrarFormularioReview = false;
          this.reviewForm.reset({ rating: 0, comment: '' });
          this.reviewUsuarioActual = updatedReview;
        },
        error: (error) => console.error('Error al actualizar review:', error)
      });
    } else {
      // Añadir una nueva reseña
      this.userMovieService.addReview(this.pelicula.id, reviewData).subscribe({
        next: (newReview) => {
          // console.log('Nueva reseña:', newReview);

          // Recargar las reseñas
          this.cargarReviews(this.pelicula.id);
          window.location.reload()

          // Cerrar el formulario y resetear
          this.mostrarFormularioReview = false;
          this.reviewForm.reset({ rating: 0, comment: '' });
          this.reviewUsuarioActual = newReview;
        },
        error: (error) => console.error('Error al añadir review:', error)
      });
    }
  }

  editarReview(): void {
    console.log('Reseña del usuario actual:', this.reviewUsuarioActual);
    if (!this.reviewUsuarioActual) {
      console.error('No hay una reseña para editar.');
      return;
    }


    this.reviewForm.patchValue({
      rating: this.reviewUsuarioActual.rating,
      comment: this.reviewUsuarioActual.comment
    });


    this.mostrarFormularioReview = true;
  }

  eliminarReview(): void {
    if (confirm('¿Estás seguro de que quieres eliminar tu review?')) {
      this.userMovieService.deleteReview(this.pelicula.id).subscribe({
        next: () => {
          this.reviewUsuarioActual = null;
          this.cargarReviews(this.pelicula.id);
        },
        error: (error) => console.error('Error al eliminar review:', error)
      });
    }
  }

  setRating(rating: number): void {
    this.reviewForm.patchValue({ rating });
  }



}