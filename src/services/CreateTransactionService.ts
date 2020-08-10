import { getRepository } from 'typeorm';

import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  private transactionRepository: TransactionsRepository;

  constructor(transactionRepository: TransactionsRepository) {
    this.transactionRepository = transactionRepository;
  }

  private async getCategoryId(categoryName: string): Promise<string> {
    const repository = getRepository(Category);
    let category = await repository.findOne({ where: { title: categoryName } });

    if (category) return category.id;

    category = new Category();
    category.title = categoryName;
    await repository.save(category);

    return category.id;
  }

  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const category_id = await this.getCategoryId(category);

    const repository = getRepository(Transaction);

    const balance = await this.transactionRepository.getBalance();

    if (type === 'outcome' && value > balance.total) {
      throw new AppError('Invalid transaction');
    }

    const transaction = new Transaction();
    transaction.title = title;
    transaction.type = type;
    transaction.value = value;
    transaction.category_id = category_id;

    await repository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
