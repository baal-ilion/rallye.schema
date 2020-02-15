import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../authentication.service';
import { Router } from '@angular/router';

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
    this.authenticationService.login(user).subscribe(resp => {
      const jwt = resp.headers.get('Authorization');
      this.authenticationService.saveToken(jwt);
      this.router.navigateByUrl('/');
    }, err => {
      console.log(err);
    });
  }
}
