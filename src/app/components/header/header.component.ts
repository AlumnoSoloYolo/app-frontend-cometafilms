import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  searchForm: FormGroup;

  constructor(private fb: FormBuilder, private router: Router, private authService: AuthService) {

    this.searchForm = this.fb.group({
      query: ['', [Validators.minLength(2)]]
    })
  }

  buscar(): void {
    if (this.searchForm.value.query?.trim()) {
      this.router.navigate(['/buscador-peliculas'], {
        queryParams: { query: this.searchForm.value.query }
      });
      this.searchForm.reset();
    }
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  getUserAvatarPath(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const avatar = user.avatar || 'avatar1';
    return `/avatares/${avatar}.gif`;
  }

  getUsername(): string {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.username || 'Usuario';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
