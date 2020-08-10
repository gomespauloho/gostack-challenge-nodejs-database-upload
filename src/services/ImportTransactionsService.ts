import path from 'path';
import fs from 'fs';
import csvParse from 'csv-parse';

import Transaction from '../models/Transaction';
import uploadConfig from '../configs/upload';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from './CreateTransactionService';

interface TransactionCsv {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  private filename: string;

  private repository: TransactionsRepository;

  constructor(filename: string, repository: TransactionsRepository) {
    this.filename = filename;
    this.repository = repository;
  }

  private async readFile(): Promise<TransactionCsv[]> {
    const filePath = path.join(uploadConfig.directory, this.filename);

    const stream = fs.createReadStream(filePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
      columns: ['title', 'type', 'value', 'category'],
    });

    const parseCSV = stream.pipe(parseStream);

    const lines: TransactionCsv[] = [];

    parseCSV.on('data', line => {
      lines.push(line);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    await fs.promises.unlink(filePath);

    return lines;
  }

  async execute(): Promise<Transaction[]> {
    const transactionsCsv = await this.readFile();

    if (transactionsCsv.length === 0) {
      throw new AppError('No one transactions to import.');
    }

    const service = new CreateTransactionService(this.repository);

    const transactions: Transaction[] = [];

    for (let i = 0; i < transactionsCsv.length; i += 1) {
      const transactionCsv = transactionsCsv[i];

      const transaction = await service.execute({ ...transactionCsv });

      transactions.push(transaction);
    }

    return transactions;
  }
}

export default ImportTransactionsService;
