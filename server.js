const express = require('express');
const mongoose = require('mongoose');
const Task = require('./models/Task');

const app = express();
app.use(express.json()); // Middleware для парсинга JSON body

// Подключение к MongoDB (замените URI на ваш)
mongoose.connect('mongodb+srv://polosbekovb_db_user:EDdUsj5BJIYr1cLm@cluster0.1ekqp65.mongodb.net/tasks_db?appName=Cluster0')
  .then(() => console.log('Успешно подключено к MongoDB Atlas'))
  .catch(err => console.error('Ошибка подключения к БД:', err));

// ==========================================
// БОНУС: Получить статистику по статусам
// ВАЖНО: Этот роут должен быть ДО /tasks/:id
// ==========================================
app.get('/tasks/stats', async (req, res) => {
  try {
    const stats = await Task.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Форматируем результат в нужный вид: { todo: X, inProgress: Y, done: Z }
    const result = { todo: 0, inProgress: 0, done: 0 };
    stats.forEach(stat => {
      if (stat._id === 'todo') result.todo = stat.count;
      if (stat._id === 'in-progress') result.inProgress = stat.count; // camelCase для ответа
      if (stat._id === 'done') result.done = stat.count;
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// УСЛОЖНЕНИЕ: Поиск по title
// ВАЖНО: Этот роут также должен быть ДО /tasks/:id
// ==========================================
app.get('/tasks/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: 'Параметр запроса "q" обязателен' });
    }
    
    // Поиск по регулярному выражению (регистронезависимый)
    const tasks = await Task.find({ title: { $regex: q, $options: 'i' } });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// БАЗОВЫЕ ENDPOINTS И СОРТИРОВКА
// ==========================================

// 1. Создать задачу
app.post('/tasks', async (req, res) => {
  try {
    const { title, description } = req.body;
    const newTask = new Task({ title, description });
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 2. Получить все задачи (+ УСЛОЖНЕНИЕ: Сортировка)
app.get('/tasks', async (req, res) => {
  try {
    const { sort } = req.query;
    let sortOptions = {};

    // Обработка параметров сортировки
    if (sort === 'asc') sortOptions.createdAt = 1;
    if (sort === 'desc') sortOptions.createdAt = -1;

    const tasks = await Task.find().sort(sortOptions);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Получить одну задачу
app.get('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Задача не найдена' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Неверный формат ID' });
  }
});

// 4. Удалить задачу
app.delete('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Задача не найдена' });
    res.json({ message: 'Задача успешно удалена', deletedId: task._id });
  } catch (error) {
    res.status(500).json({ error: 'Неверный формат ID' });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});