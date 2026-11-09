import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { User } from '../interfaces/user.interface';
import { map } from "rxjs/operators";


@Injectable({
  providedIn: 'root'
})
export class UserService {
  private userUrl = `/services/user`;

  constructor(private http: HttpClient) {}

  getUserDetails(): Observable<User> {
    return this.http.get<User>(this.userUrl);
  }

  getUserRoles(): Observable<string[]> {
    return this.http.get<{ roles: string[] }>(this.userUrl).pipe(
      map((response) => response.roles || [])
    );
  }
}
