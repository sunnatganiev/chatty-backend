import { Request, Response } from 'express';
import JWT from 'jsonwebtoken';
import HTTP_STATUS from 'http-status-codes';

import { loginSchema } from '@auth/schemes/signin';
import { joiValidation } from '@globals/decorators/joi-validation.decorators';
import { authService } from '@services/db/auth.service';
import { IAuthDocument } from '@auth/interfaces/auth.interface';
import { BadRequestError } from '@globals/helpers/error-handler';
import { config } from '@root/config';
import { IUserDocument } from '@user/interfaces/user.interface';
import { userService } from '@services/db/user.service';

export class SignIn {
  @joiValidation(loginSchema)
  public async read(req: Request, res: Response): Promise<void> {
    const { username, password, email } = req.body;

    if (!username && !email) throw new BadRequestError('Username or email should be provided');

    const existingUser: IAuthDocument = await authService.getAuthUserByUsername(username, email);

    if (!existingUser) throw new BadRequestError('Invalid credentials');

    const passwordMatch: boolean = await existingUser.comparePassword(password);
    if (!passwordMatch) throw new BadRequestError('Invalid credentials');

    const user: IUserDocument = await userService.getUserByAuthId(`${existingUser._id}`);

    const userJwt: string = JWT.sign(
      {
        userId: user._id,
        uId: existingUser.uId,
        email: existingUser.email,
        username: existingUser.username,
        avatarColor: existingUser.avatarColor
      },
      config.JWT_TOKEN!
    );
    req.session = { jwt: userJwt };

    const userDocument: IUserDocument = {
      ...user,
      authId: existingUser._id,
      username: existingUser.username,
      email: existingUser.email,
      avatarColor: existingUser.avatarColor,
      uId: existingUser.uId,
      createdAt: existingUser.createdAt
    } as IUserDocument;

    res.status(HTTP_STATUS.OK).json({ message: 'User login successfully', user: userDocument, token: userJwt });
  }
}
