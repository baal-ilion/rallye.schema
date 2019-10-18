import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from './authentication.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'rallye-schema-webapp';
  collapsed = true;

  constructor(private authenticationService: AuthenticationService,
              private router: Router) {
  }

  isAdmin() {
    return this.authenticationService.isAdmin();
  }

  isUser() {
    return this.authenticationService.isUser();
  }

  username() {
    return this.authenticationService.username();
  }

  isLoggedIn() {
    return this.authenticationService.isLoggedIn();
  }

  ngOnInit(): void {
    this.authenticationService.isLoggedIn();
  }

  login() {
    this.authenticationService.obtainAccessToken();
  }

  logOut() {
    this.authenticationService.logout();
    this.router.navigateByUrl('/');
  }

}
