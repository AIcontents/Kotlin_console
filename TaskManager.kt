import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.io.File
import java.util.*

/**
 * Data layer: Task model
 */
enum class Priority(val level: Int) {
    LOW(1), MEDIUM_LOW(2), MEDIUM(3), MEDIUM_HIGH(4), HIGH(5);
    
    companion object {
        fun fromInt(value: Int) = values().find { it.level == value } ?: LOW
    }
}

data class Task(
    val id: Int,
    var title: String,
    var description: String,
    var priority: Priority,
    var isDone: Boolean = false,
    val createdAt: LocalDateTime = LocalDateTime.now()
)

/**
 * Repository layer: Logic and Data management
 */
class TaskRepository {
    private val tasks = mutableListOf<Task>()
    private var nextId = 1

    fun addTask(title: String, description: String, priority: Priority): Task {
        val task = Task(nextId++, title, description, priority)
        tasks.add(task)
        return task
    }

    fun getAllTasks(): List<Task> = tasks.toList()

    fun findTaskById(id: Int): Task? = tasks.find { it.id == id }

    fun updateTask(id: Int, title: String?, description: String?, priority: Priority?, isDone: Boolean?): Boolean {
        val task = findTaskById(id) ?: return false
        title?.let { if (it.isNotBlank()) task.title = it }
        description?.let { if (it.isNotBlank()) task.description = it }
        priority?.let { task.priority = it }
        isDone?.let { task.isDone = it }
        return true
    }

    fun deleteTask(id: Int): Boolean = tasks.removeIf { it.id == id }

    fun searchTasks(query: String?, priority: Priority?, isDone: Boolean?): List<Task> {
        return tasks.filter { task ->
            (query == null || task.title.contains(query, ignoreCase = true)) &&
            (priority == null || task.priority == priority) &&
            (isDone == null || task.isDone == isDone)
        }
    }

    fun sortTasks(by: String, ascending: Boolean = true): List<Task> {
        val comparator = when (by.lowercase()) {
            "title" -> compareBy<Task> { it.title }
            "priority" -> compareBy<Task> { it.priority.level }
            "date" -> compareBy<Task> { it.createdAt }
            else -> compareBy<Task> { it.id }
        }
        return if (ascending) tasks.sortedWith(comparator) else tasks.sortedWith(comparator).reversed()
    }

    fun saveToFile(filename: String) {
        val file = File(filename)
        val content = tasks.joinToString("\n") { task ->
            "${task.id}|${task.title}|${task.description}|${task.priority.level}|${task.isDone}|${task.createdAt}"
        }
        file.writeText(content)
    }

    fun loadFromFile(filename: String) {
        val file = File(filename)
        if (!file.exists()) return
        tasks.clear()
        file.readLines().forEach { line ->
            val parts = line.split("|")
            if (parts.size == 6) {
                val task = Task(
                    id = parts[0].toInt(),
                    title = parts[1],
                    description = parts[2],
                    priority = Priority.fromInt(parts[3].toInt()),
                    isDone = parts[4].toBoolean(),
                    createdAt = LocalDateTime.parse(parts[5])
                )
                tasks.add(task)
                if (task.id >= nextId) nextId = task.id + 1
            }
        }
    }
}

/**
 * Controller/Menu layer: CLI Interaction
 */
class MenuController(private val repo: TaskRepository) {
    private val scanner = Scanner(System.`in`)
    private val formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")

    fun start() {
        while (true) {
            println("\n--- TASK MANAGER ---")
            println("1 — Create Task")
            println("2 — Show All Tasks")
            println("3 — Find Task")
            println("4 — Edit Task")
            println("5 — Delete Task")
            println("6 — Sorting")
            println("7 — Save to File")
            println("8 — Load from File")
            println("0 — Exit")
            print("Choice: ")

            when (scanner.nextLine()) {
                "1" -> createTask()
                "2" -> showTasks(repo.getAllTasks())
                "3" -> searchTasks()
                "4" -> editTask()
                "5" -> deleteTask()
                "6" -> sortTasks()
                "7" -> { repo.saveToFile("tasks.txt"); println("Saved!") }
                "8" -> { repo.loadFromFile("tasks.txt"); println("Loaded!") }
                "0" -> return
                else -> println("Invalid choice!")
            }
        }
    }

    private fun createTask() {
        print("Title: ")
        val title = scanner.nextLine()
        print("Description: ")
        val desc = scanner.nextLine()
        print("Priority (1-5): ")
        val priority = Priority.fromInt(scanner.nextLine().toIntOrNull() ?: 1)
        repo.addTask(title, desc, priority)
        println("Task created!")
    }

    private fun showTasks(tasks: List<Task>) {
        println("%-3s | %-20s | %-8s | %-5s | %-16s".format("ID", "Title", "Priority", "Done", "CreatedAt"))
        println("-".repeat(60))
        tasks.forEach {
            println("%-3d | %-20s | %-8s | %-5s | %-16s".format(
                it.id, it.title, it.priority, if (it.isDone) "Yes" else "No", it.createdAt.format(formatter)
            ))
        }
    }

    private fun searchTasks() {
        print("Search by title (empty for all): ")
        val query = scanner.nextLine().takeIf { it.isNotBlank() }
        val results = repo.searchTasks(query, null, null)
        showTasks(results)
    }

    private fun editTask() {
        print("Enter ID: ")
        val id = scanner.nextLine().toIntOrNull() ?: return
        print("New title (empty to skip): ")
        val title = scanner.nextLine().takeIf { it.isNotBlank() }
        print("New priority (empty to skip): ")
        val priority = scanner.nextLine().toIntOrNull()?.let { Priority.fromInt(it) }
        print("Is done? (y/n/empty): ")
        val doneStr = scanner.nextLine()
        val isDone = if (doneStr == "y") true else if (doneStr == "n") false else null
        
        if (repo.updateTask(id, title, null, priority, isDone)) println("Updated!") else println("Not found!")
    }

    private fun deleteTask() {
        print("Enter ID to delete: ")
        val id = scanner.nextLine().toIntOrNull() ?: return
        print("Confirm delete (y/n): ")
        if (scanner.nextLine() == "y") {
            repo.deleteTask(id)
            println("Deleted!")
        }
    }

    private fun sortTasks() {
        println("Sort by: 1-Title, 2-Priority, 3-Date")
        val by = when(scanner.nextLine()) {
            "1" -> "title"
            "2" -> "priority"
            "3" -> "date"
            else -> "id"
        }
        repo.sortTasks(by)
        println("Done sorting (see view).")
    }
}

fun main() {
    val repository = TaskRepository()
    val menu = MenuController(repository)
    menu.start()
}
