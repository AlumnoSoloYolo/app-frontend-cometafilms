import { Component, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VotoColorPipe } from '../../shared/pipes/voto-color.pipe';
import { PeliculasService } from '../../services/peliculas.service';
import { UserMovieService } from '../../services/user.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PeliculaCardComponent } from '../pelicula-card/pelicula-card.component';
import { AuthService } from '../../services/auth.service';


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
  currentUser: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private pelisService: PeliculasService,
    private userMovieService: UserMovieService,
    private sanitizer: DomSanitizer,
    private fb: FormBuilder,
    private authService: AuthService
  ) {


    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });


    this.reviewForm = this.fb.group({
      rating: [0, [Validators.required, Validators.min(1), Validators.max(10)]],
      comment: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]]
    });


    window.scrollTo({
      top: -100,
      left: 0,
      behavior: 'smooth'
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
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


  isCurrentUserReview(review: any): boolean {
    return this.currentUser?.id === review.userId;
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

    const scrollContenido = container.querySelector('.movie-scroll-content');
    if (!scrollContenido) return;

    const itemAncho = scrollContenido.querySelector('.movie-scroll-item')?.clientWidth || 300;
    const scrollCantidad = itemAncho * 2;
    const scrollActual = scrollContenido.scrollLeft;

    let newScroll = direction === 'right'
      ? Math.min(scrollActual + scrollCantidad)
      : Math.max(scrollActual - scrollCantidad);

    scrollContenido.scrollTo({
      left: newScroll,
      behavior: 'smooth'
    });
  }

  cargarReviews(movieId: string): void {
    this.cargandoReviews = true;

    // Solo cargar reseñas de nuestra base de datos (no TMDB)
    this.userMovieService.getReviewsPelicula(movieId).subscribe({
      next: (data) => {
        const userReviews = data.reviews.map((review: any) => ({
          ...review,
          avatar: this.getAvatarPath(review.avatar || 'avatar5')
        }));

        this.reviews = userReviews;

        // Verificar si el usuario actual tiene una reseña
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

      this.userMovieService.updateReview(this.pelicula.id, reviewData).subscribe({
        next: (updatedReviewResponse) => {
          console.log('Respuesta de actualización:', updatedReviewResponse);


          const updatedReview = updatedReviewResponse.review;


          const index = this.reviews.findIndex(review => review._id === updatedReview._id);
          if (index !== -1) {
            this.reviews[index] = updatedReview;
          } else {
            this.reviews.unshift(updatedReview);
          }

          this.cargarReviews(this.pelicula.id);
          window.location.reload()


          this.mostrarFormularioReview = false;
          this.reviewForm.reset({ rating: 0, comment: '' });
          this.reviewUsuarioActual = updatedReview;
        },
        error: (error) => console.error('Error al actualizar review:', error)
      });
    } else {

      this.userMovieService.addReview(this.pelicula.id, reviewData).subscribe({
        next: (newReview) => {


          this.cargarReviews(this.pelicula.id);
          window.location.reload()


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

  navigateReview(review: any): void {

    if (review && review.reviewId) {
      this.router.navigate(['/resenia', review.reviewId]);
    } else {
      console.error('No se encontró el ID de la reseña.');
    }
  }

  trackReview(index: number, review: any): any {
    return review.reviewId;
  }
}