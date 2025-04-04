
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environments';
import { UserResponse, User, UserProfile } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserSocialService {
  private apiUrl = environment.apiUrl + '/social';

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

  getAllUsers(page: number = 1, limit: number = 12): Observable<UserResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<UserResponse>(
      `${this.apiUrl}/users`,
      { headers: this.getHeaders().headers, params }
    );
  }

  searchUsers(username: string): Observable<User[]> {
    const params = new HttpParams().set('username', username);

    return this.http.get<User[]>(
      `${this.apiUrl}/users/search`,
      { headers: this.getHeaders().headers, params }
    );
  }

  getUserProfile(userId: string): Observable<UserProfile> {
    return this.http.get<UserProfile>(
      `${this.apiUrl}/users/${userId}`,
      this.getHeaders()
    );
  }

  followUser(userId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/follow/${userId}`,
      {},
      this.getHeaders()
    );
  }

  unfollowUser(userId: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/follow/${userId}`,
      this.getHeaders()
    );
  }
}