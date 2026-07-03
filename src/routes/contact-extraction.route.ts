import { Router, type Request, type Response, type NextFunction } from 'express';
import { contactExtractorController } from '../controllers/contact-extractor.controller';
import { z } from 'zod';
import { validate } from '../utils/validations';

const router = Router();

const extractionSchema = z.object({
  body: z.object({
    leadId: z.string().min(1, 'leadId is required'),
  }),
});

const bulkExtractionSchema = z.object({
  body: z.object({
    limit: z.number().min(1).max(100).optional().default(50),
  }),
});

router.post('/', validate(extractionSchema), (req: Request, res: Response, next: NextFunction) => {
  contactExtractorController.extractContacts(req, res, next);
});

router.post('/bulk', validate(bulkExtractionSchema), (req: Request, res: Response, next: NextFunction) => {
  contactExtractorController.bulkExtractContacts(req, res, next);
});

router.post('/crawl', validate(extractionSchema), (req: Request, res: Response, next: NextFunction) => {
  contactExtractorController.crawlWebsite(req, res, next);
});

router.post('/social', validate(extractionSchema), (req: Request, res: Response, next: NextFunction) => {
  contactExtractorController.extractSocialLinks(req, res, next);
});

router.post('/owner', validate(extractionSchema), (req: Request, res: Response, next: NextFunction) => {
  contactExtractorController.detectOwner(req, res, next);
});

router.post('/contact-pages', validate(extractionSchema), (req: Request, res: Response, next: NextFunction) => {
  contactExtractorController.detectContactPages(req, res, next);
});

router.post('/full', validate(extractionSchema), (req: Request, res: Response, next: NextFunction) => {
  contactExtractorController.fullExtraction(req, res, next);
});

export default router;
