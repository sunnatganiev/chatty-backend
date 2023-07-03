import { SignUp } from '@auth/controllers/signup';
import express, { Router } from 'express';

class AuthRouts {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    this.router.post('/signup', SignUp.prototype.create);
    console.log('AUTHROUTES')
    return this.router;
  }
}

export const authRoutes: AuthRouts = new AuthRouts();
