import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../authentication.service';
import { Router } from '@angular/router';

interface LoginResponse {
  access_token: string;
  access_expiration: number;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  constructor(private authenticationService: AuthenticationService,
              private router: Router) { }

  ngOnInit() {
  }

  onLogin(user) {
    this.authenticationService.login(user).subscribe((resp) => {
      const jwt = resp["access_token"];
      this.authenticationService.saveToken(jwt);
      this.router.navigateByUrl('/');
    }, err => {
      console.log(err);
    });
  }
}

