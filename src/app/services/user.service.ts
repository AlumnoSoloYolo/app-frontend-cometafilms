import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';


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
}


export interface ReviewResponse {
  message: string;
  review: Review;
}

interface ReviewsPeli {
  movie: string;
  totalReviews: number;
  reviews: Review[];
}

@Injectable({
  providedIn: 'root'
})
export class UserMovieService {
  private apiUrl = environment.apiUrl;


  constructor(private http: HttpClient) { }


  private getToken(): string | null {
    return localStorage.getItem('token');

  }


  private getHeaders(): { headers: HttpHeaders } {
    const token = this.getToken();
    return {
      headers: new HttpHeaders()
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${token || ''}`)
    };
  }


  addPelisPendientes(movieId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/user-movies/watchlist`,
      { movieId },
      this.getHeaders()
    );
  }

  removePelisPendientes(movieId: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/user-movies/watchlist`,
      {
        headers: this.getHeaders().headers,
        body: { movieId }
      }
    );
  }

  addPelisVistas(movieId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/user-movies/watched`,
      { movieId },
      this.getHeaders()
    );
  }

  removePelisVistas(movieId: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/user-movies/watched`,
      {
        headers: this.getHeaders().headers,
        body: { movieId }
      }
    );
  }

  getUserPerfil(): Observable<any> {

    return this.http.get(
      `${this.apiUrl}/user-movies/profile`,
      this.getHeaders()
    );
  }


  getReviewsUsuario(): Observable<Review[]> {
    return this.http.get<Review[]>(
      `${this.apiUrl}/user-movies/reviews`,
      this.getHeaders()
    )
  }

  getReviewsPelicula(movieId: string): Observable<ReviewsPeli> {
    return this.http.get<ReviewsPeli>(
      `${this.apiUrl}/user-movies/movies/${movieId}/reviews`,
      this.getHeaders()
    );
  }

  addReview(movieId: string, review: {
    rating: number;
    comment: string;
  }): Observable<Review> {
    return this.http.post<Review>(
      `${this.apiUrl}/user-movies/reviews`,
      { movieId, ...review },
      this.getHeaders()
    );
  }


  updateReview(movieId: string, review: {
    rating: number;
    comment: string;
  }): Observable<ReviewResponse> {
    return this.http.put<ReviewResponse>(
      `${this.apiUrl}/user-movies/reviews/${movieId}`,
      review,
      this.getHeaders()
    );
  }


  deleteReview(movieId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/user-movies/reviews/${movieId}`,
      this.getHeaders()
    );
  }
}