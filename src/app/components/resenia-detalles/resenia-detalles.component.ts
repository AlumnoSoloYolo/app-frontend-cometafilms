import { Component, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { UserMovieService } from '../../services/user.service';
import { PeliculasService } from '../../services/peliculas.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserSocialService } from '../../services/social.service';

interface Comment {
  _id?: string;
  text: string;
  userId: string;
  username: string;
  avatar: string;
  parentId?: string | null;
  createdAt: Date;
  isEdited?: boolean;
  editedAt?: Date;
  replies?: Comment[];
}

@Component({
  selector: 'app-resenia-detalles',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './resenia-detalles.component.html',
  styleUrl: './resenia-detalles.component.css'
})
export class ReseniaDetallesComponent implements OnInit {
  review: any = null;
  movieDetails: any = null;
  isLoading = true;

  comments: Comment[] = [];
  organizedComments: Comment[] = [];
  commentForm: FormGroup;
  replyingTo: Comment | null = null;
  editingComment: Comment | null = null;
  isFollowing: boolean = false;

  currentUser: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userMovieService: UserMovieService,
    private peliculasService: PeliculasService,
    private authService: AuthService,
    private fb: FormBuilder,
    private userSocialService: UserSocialService
  ) {
    this.commentForm = this.fb.group({
      text: ['', [Validators.required, Validators.maxLength(500)]]
    });

    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const reviewId = params['reviewId'];

      if (reviewId) {
        this.loadReview(reviewId);
      } else {
        this.router.navigate(['/']);
      }
    });
  }

  loadReview(reviewId: string): void {
    this.userMovieService.getReviewById(reviewId).subscribe({
      next: (review) => {
        this.review = review;


        if (this.currentUser && review.userId !== this.currentUser.id) {
          this.checkFollowing(review.userId ?? '');
        }

        if (review._id) {
          this.loadComments(review._id);
        }

        // Una vez tenemos la reseña, cargamos los detalles de la película
        this.peliculasService.getDetallesPelicula(review.movieId).subscribe({
          next: (movie) => {
            this.movieDetails = movie;
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Error al cargar detalles de película:', error);
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error al cargar reseña:', error);
        this.isLoading = false;
      }
    });
  }

  loadComments(reviewId: string): void {
    this.userMovieService.getReviewComments(reviewId).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.organizedComments = this.organizeCommentsHierarchy(comments);
      },
      error: (error) => {
        console.error('Error al cargar comentarios:', error);
      }
    });
  }

  checkFollowing(userId: string): void {
    this.userSocialService.getUserProfile(userId).subscribe({
      next: (profile: any) => {
        // Verificar si el perfil incluye la propiedad isFollowing
        this.isFollowing = profile.isFollowing || false;
      },
      error: (error) => console.error('Error al verificar seguimiento:', error)
    });
  }

  toggleFollow(event: Event): void {
    event.stopPropagation(); // Importante para evitar la propagación del evento

    if (!this.review || !this.review.userId) return;

    if (this.isFollowing) {
      // Dejar de seguir
      this.userSocialService.unfollowUser(this.review.userId).subscribe({
        next: () => {
          this.isFollowing = false;
        },
        error: (error) => console.error('Error al dejar de seguir:', error)
      });
    } else {
      // Seguir
      this.userSocialService.followUser(this.review.userId).subscribe({
        next: () => {
          this.isFollowing = true;
        },
        error: (error) => console.error('Error al seguir:', error)
      });
    }
  }

  // Organiza los comentarios en estructura jerárquica para mostrarlos anidados
  organizeCommentsHierarchy(comments: Comment[]): Comment[] {
    const rootComments: Comment[] = [];
    const commentMap = new Map<string, Comment>();

    // Primero, crear un mapa con todos los comentarios
    comments.forEach(comment => {
      const commentCopy = { ...comment, replies: [] };
      commentMap.set(comment._id!, commentCopy);
    });

    // Organizar en estructura jerárquica
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment._id!);

      if (comment.parentId) {
        // Es una respuesta, agregar al padre
        const parentComment = commentMap.get(comment.parentId);
        if (parentComment) {
          if (!parentComment.replies) {
            parentComment.replies = [];
          }
          parentComment.replies.push(commentWithReplies!);
        } else {
          // Si no se encuentra el padre, agregar a comentarios raíz
          rootComments.push(commentWithReplies!);
        }
      } else {
        // Es un comentario raíz
        rootComments.push(commentWithReplies!);
      }
    });

    // Ordenar por fecha (más recientes primero)
    return rootComments.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  submitComment(): void {
    if (this.commentForm.invalid) return;

    const text = this.commentForm.get('text')!.value;

    if (this.editingComment) {
      // Editar comentario existente
      this.userMovieService.editComment(
        this.review._id,
        this.editingComment._id!,
        text
      ).subscribe({
        next: (updatedComment) => {
          // Actualizar comentario en el array local
          const index = this.comments.findIndex(c => c._id === updatedComment._id);
          if (index !== -1) {
            this.comments[index] = updatedComment;
          }

          // Reorganizar comentarios
          this.organizedComments = this.organizeCommentsHierarchy(this.comments);

          // Resetear estado de edición
          this.editingComment = null;
          this.commentForm.reset();
        },
        error: (error) => {
          console.error('Error al editar comentario:', error);
        }
      });
    } else {
      // Añadir nuevo comentario o respuesta
      const parentId = this.replyingTo ? this.replyingTo._id : null;

      this.userMovieService.addComment(this.review._id, text, parentId).subscribe({
        next: (newComment) => {
          // Añadir comentario al array local
          this.comments.push(newComment);

          // Reorganizar comentarios
          this.organizedComments = this.organizeCommentsHierarchy(this.comments);

          // Resetear estado
          this.replyingTo = null;
          this.commentForm.reset();
        },
        error: (error) => {
          console.error('Error al añadir comentario:', error);
        }
      });
    }
  }

  replyToComment(comment: Comment): void {
    this.replyingTo = comment;
    this.editingComment = null;
    this.commentForm.reset();

    // Hacer scroll al formulario
    setTimeout(() => {
      document.getElementById('commentForm')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  editComment(comment: Comment): void {
    this.editingComment = comment;
    this.replyingTo = null;
    this.commentForm.patchValue({ text: comment.text });

    // Hacer scroll al formulario
    setTimeout(() => {
      document.getElementById('commentForm')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  cancelAction(): void {
    this.replyingTo = null;
    this.editingComment = null;
    this.commentForm.reset();
  }

  deleteComment(commentId: string): void {
    if (confirm('¿Estás seguro de que quieres eliminar este comentario?')) {
      this.userMovieService.deleteComment(this.review._id, commentId).subscribe({
        next: () => {
          // Eliminar comentario del array local
          this.comments = this.comments.filter(c => c._id !== commentId);

          // Reorganizar comentarios
          this.organizedComments = this.organizeCommentsHierarchy(this.comments);
        },
        error: (error) => {
          console.error('Error al eliminar comentario:', error);
        }
      });
    }
  }

  canEditComment(comment: Comment): boolean {
    return this.currentUser && this.currentUser.id === comment.userId;
  }

  canDeleteComment(comment: Comment): boolean {
    return this.currentUser &&
      (this.currentUser.id === comment.userId ||
        this.currentUser.id === this.review.userId);
  }

  getAvatarPath(avatar: string): string {
    return `/avatares/${avatar}.gif`;
  }

  volverAPelicula(): void {
    if (this.review && this.review.movieId) {
      this.router.navigate(['/pelicula', this.review.movieId]);
    } else {
      this.router.navigate(['/']);
    }
  }



}