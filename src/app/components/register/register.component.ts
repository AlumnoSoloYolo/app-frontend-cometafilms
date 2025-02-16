import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  avatars = [
    'avatar1', 'avatar2', 'avatar3', 'avatar4',
    'avatar5', 'avatar6', 'avatar7', 'avatar8'
  ];
  selectedAvatar = 'avatar1';
  mensajeExitoso = "";
  showMensajeExitoso = false;

  registerForm = new FormGroup({
    username: new FormControl('', [
      Validators.required,
      Validators.minLength(3)
    ]),
    email: new FormControl('', [
      Validators.required,
      Validators.pattern(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/)
    ]),
    password: new FormControl('', [
      Validators.required,
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    ]),
    confirmPassword: new FormControl('', [
      Validators.required
    ]),
    avatar: new FormControl('avatar1', [Validators.required])
  }, { validators: this.passwordMatchValidator });

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  getAvatarPath(avatar: string): string {
    return `/avatares/${avatar}.gif`
  }

  selectAvatar(avatar: string) {
    this.registerForm.get('avatar')?.setValue(avatar);
  }

  getErrorMessage(field: string): string {
    const control = this.registerForm.get(field);

    if (control?.errors) {
      if (control.errors['required']) return 'Este campo es obligatorio';
      if (control.errors['minlength']) return 'Longitud mínima no alcanzada';

      // Errores específicos de username
      if (control.errors['userExists']) {
        return control.errors['userExists'];
      }

      // Errores específicos de email
      if (control.errors['emailExists']) {
        return control.errors['emailExists'];
      }

      if (control.errors['pattern']) {
        switch (field) {
          case 'email':
            return 'Email no válido';
          case 'username':
            return 'Nombre de usuario no válido';
          case 'password':
            return 'La contraseña debe contener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial';
        }
      }
      if (control.errors['passwordMismatch']) return 'Las contraseñas no coinciden';
    }
    return '';
  }

  get formulario() {
    return this.registerForm.controls;
  }

  onRegister(event: Event) {

    event.preventDefault();
    if (this.registerForm.invalid || this.registerForm.disabled) {
      return;
    }

    // Deshabilitar el formulario para prevenir envíos múltiples
    this.registerForm.disable();

    const { username, email, password, avatar } = this.registerForm.value;

    this.authService.register(username!, email!, password!, avatar!)
      .pipe(
        // Asegurarse de habilitar el formulario incluso si hay un error
        finalize(() => {
          this.registerForm.enable();
        })
      )
      .subscribe({
        next: (response) => {
          this.mensajeExitoso = `¡Registro exitoso! Bienvenido, ${username}. Serás redirigido al login.`;
          this.showMensajeExitoso = true;

          setTimeout(() => {
            this.showMensajeExitoso = false;
            this.router.navigate(['/login']);
          }, 3000);
        },
        error: (error) => {
          console.error('Error en el registro:', error);

          // Resetear errores previos
          this.registerForm.get('username')?.setErrors(null);
          this.registerForm.get('email')?.setErrors(null);

          // Obtener el mensaje de error
          const errorMessage = error.error?.message ||
            error.message ||
            'Hubo un problema en el servidor';

          // Manejar errores específicos
          if (errorMessage.includes('Username')) {
            this.registerForm.get('username')?.setErrors({
              userExists: 'El nombre de usuario ya está en uso'
            });
          }

          if (errorMessage.includes('Email')) {
            this.registerForm.get('email')?.setErrors({
              emailExists: 'El correo electrónico ya está registrado'
            });
          }

          // Mostrar mensaje de error
          this.mensajeExitoso = errorMessage;
          this.showMensajeExitoso = true;

          setTimeout(() => {
            this.showMensajeExitoso = false;

          }, 3000);
        }
      });
  }
}