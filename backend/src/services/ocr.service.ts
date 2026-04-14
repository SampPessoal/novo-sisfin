import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../config/logger';

export interface OCRResult {
  dataDocumento?: string;
  cnpjEmissor?: string;
  razaoSocialEmissor?: string;
  valor?: number;
  descricao?: string;
  localidade?: string;
  confianca: number;
  campos: {
    campo: string;
    valor: string | number | null;
    confianca: number;
  }[];
}

export class OCRService {
  static async extractData(fileBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    if (env.OCR_PROVIDER === 'extractlab') {
      return this.extractWithExtractLab(fileBuffer, mimeType);
    }
    return this.extractFallback();
  }

  private static async extractWithExtractLab(
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<OCRResult> {
    try {
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: mimeType });
      formData.append('file', blob, 'document');

      const response = await axios.post(
        'https://api.extractlab.com/v1/extract',
        formData,
        {
          headers: {
            Authorization: `Bearer ${env.EXTRACTLAB_API_KEY}`,
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000,
        }
      );

      const data = response.data;
      const campos = [
        { campo: 'dataDocumento', valor: data.date || null, confianca: data.date_confidence || 0 },
        { campo: 'cnpjEmissor', valor: data.cnpj || data.cpf || null, confianca: data.cnpj_confidence || 0 },
        { campo: 'razaoSocialEmissor', valor: data.company_name || null, confianca: data.name_confidence || 0 },
        { campo: 'valor', valor: data.total_amount || null, confianca: data.amount_confidence || 0 },
        { campo: 'descricao', valor: data.description || null, confianca: data.description_confidence || 0 },
        { campo: 'localidade', valor: data.city || null, confianca: data.city_confidence || 0 },
      ];

      const avgConfianca = Math.round(
        campos.reduce((sum, c) => sum + c.confianca, 0) / campos.length
      );

      return {
        dataDocumento: data.date,
        cnpjEmissor: data.cnpj || data.cpf,
        razaoSocialEmissor: data.company_name,
        valor: data.total_amount ? parseFloat(data.total_amount) : undefined,
        descricao: data.description,
        localidade: data.city,
        confianca: avgConfianca,
        campos,
      };
    } catch (error) {
      logger.error('ExtractLab OCR failed', { error });
      return this.extractFallback();
    }
  }

  private static extractFallback(): OCRResult {
    return {
      confianca: 0,
      campos: [
        { campo: 'dataDocumento', valor: null, confianca: 0 },
        { campo: 'cnpjEmissor', valor: null, confianca: 0 },
        { campo: 'razaoSocialEmissor', valor: null, confianca: 0 },
        { campo: 'valor', valor: null, confianca: 0 },
        { campo: 'descricao', valor: null, confianca: 0 },
        { campo: 'localidade', valor: null, confianca: 0 },
      ],
    };
  }
}
