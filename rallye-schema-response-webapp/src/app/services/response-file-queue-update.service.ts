import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ResponseFileQueueUpdateService {
  private readonly client: Client;
  private readonly updateSubject = new Subject<void>();
  private hasConnected = false;

  readonly updates$ = this.updateSubject.asObservable();

  constructor() {
    this.client = new Client({
      webSocketFactory: () => new SockJS('/ws-ranking'),
      reconnectDelay: 5000
    });
    this.client.onConnect = () => {
      // Une reconnexion peut suivre une coupure durant laquelle des événements ont été manqués.
      if (this.hasConnected) {
        this.updateSubject.next();
      }
      this.hasConnected = true;
      this.client.subscribe('/topic/responseFileQueueUpdate', () => this.updateSubject.next());
    };
    this.client.onStompError = frame => console.error('Erreur de synchronisation des formulaires', frame.headers['message']);
    this.client.activate();
  }
}
