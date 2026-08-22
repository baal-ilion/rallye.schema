import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';

export interface StageResultUpdate {
  stage?: number;
  team?: number;
  operation: 'UPDATE' | 'DELETE' | 'RESYNC';
}

@Injectable({ providedIn: 'root' })
export class StageResultUpdateService {
  private readonly client: Client;
  private readonly updateSubject = new Subject<StageResultUpdate>();
  private hasConnected = false;

  readonly updates$ = this.updateSubject.asObservable();

  constructor() {
    this.client = new Client({
      webSocketFactory: () => new SockJS('/ws-ranking'),
      reconnectDelay: 5000
    });
    this.client.onConnect = () => {
      if (this.hasConnected) {
        this.updateSubject.next({ operation: 'RESYNC' });
      }
      this.hasConnected = true;
      this.client.subscribe('/topic/stageResultUpdate', message => {
        try {
          this.updateSubject.next(JSON.parse(message.body) as StageResultUpdate);
        } catch (error) {
          console.error('Événement de mise à jour d’épreuve invalide', error);
        }
      });
    };
    this.client.onStompError = frame => console.error('Erreur de synchronisation des épreuves', frame.headers['message']);
    this.client.activate();
  }
}
