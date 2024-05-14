import { joiValidation } from '@globals/decorators/joi-validation.decorators';
import { uploads } from '@globals/helpers/cloudinary-upload';
import { BadRequestError } from '@globals/helpers/error-handler';
import { IPostDocument } from '@post/interfaces/post.interface';
import { postSchema, postWithImageSchema } from '@post/schemes/post.schemes';
import { postQueue } from '@services/queues/post.queue';
import { PostCache } from '@services/redis/post.cache';
import { socketIOPostObject } from '@sockets/post';
import { UploadApiResponse } from 'cloudinary';
import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';

const postCache: PostCache = new PostCache();

export class Update {
  @joiValidation(postSchema)
  public async post(req: Request, res: Response): Promise<void> {
    await Update.prototype.updatePost(req);
    res.status(HTTP_STATUS.OK).json({ message: 'Post updated successfully' });
  }

  @joiValidation(postWithImageSchema)
  public async postWithImage(req: Request, res: Response): Promise<void> {
    const { imgId, imgVersion } = req.body;
    if (imgId && imgVersion) {
      Update.prototype.updatePost(req);
    } else {
      const result = await Update.prototype.addImageToExistingPost(req);
      if (!result.public_id) throw new BadRequestError(result.message);
    }

    res.status(HTTP_STATUS.OK).json({ message: 'Post with image updated successfully' });
  }

  private async updatePost(req: Request): Promise<void> {
    const updatedPost: IPostDocument = await postCache.updatePostInCache(req.params.postId, req.body);
    socketIOPostObject.emit('update post', updatedPost, 'posts');
    postQueue.addPostJob('updatePostInDB', { key: req.params.postId, value: updatedPost });
  }

  private async addImageToExistingPost(req: Request): Promise<UploadApiResponse> {
    const { post, bgColor, privacy, feelings, gifUrl, profilePicture, image } = req.body;

    const result: UploadApiResponse = (await uploads(image)) as UploadApiResponse;
    if (!result.public_id) return result;

    const updatedPost: IPostDocument = {
      post,
      bgColor,
      privacy,
      feelings,
      gifUrl,
      profilePicture,
      imgId: result.public_id,
      imgVersion: result.version.toString()
    } as IPostDocument;

    const postUpdated: IPostDocument = await postCache.updatePostInCache(req.params.postId, updatedPost);
    socketIOPostObject.emit('update post', postUpdated, 'posts');
    postQueue.addPostJob('updatePostInDB', { key: req.params.postId, value: postUpdated });

    //TODO: call image queue to add image to mongodb database
    return result;
  }
}
