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

  isAuthenticated() {
    return this.authenticationService.isAuthenticated();
  }

  ngOnInit(): void {
    this.authenticationService.loadToken();
  }

  logOut() {
    this.authenticationService.logout();
    this.router.navigateByUrl('/');
  }

  username() {
    return this.authenticationService.username;
  }
}
