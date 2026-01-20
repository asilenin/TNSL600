	SL / TN Script Factory — version 6.0.0

Этот репозиторий содержит базовую библиотеку (фабрику) Google Apps Script,
предназначенную для использования в разных узкоспециализированных сценариях
(ручной запуск, фоновые триггеры, WebApp и т.д.).

Основная идея

Все скрипты используют единый контекст выполнения и единый логгер.
Поведение (UI, toast, лог-файл, тишина) определяется на этапе инициации,
а не в рабочем коде.

Рабочий код не знает:
	•	куда пишется лог;
	•	можно ли показывать UI;
	•	запущен ли он пользователем или триггером.


	Script Context (TNSV)

Каждый скрипт начинается с вызова TNInitiation(),
который создаёт и возвращает объект контекста выполнения (TNSV).

Контекст:
	•	хранит информацию о запуске;
	•	используется всеми фабриками;
	•	живёт до конца выполнения скрипта.

TNSV всегда содержит:
	•	scriptName
	•	executionId
	•	startTime
	•	user
	•	effectiveUser
	•	runMode
	•	logBuffer
	•	ss, ssId

	Run Modes

Поведение скрипта определяется параметром runMode.

Поддерживаемые режимы:
	•	USER_SILENT
Ручной запуск, без UI и toast, лог только в консоль.
	•	USER_TOAST
Ручной запуск, toast пользователю, лог в консоль.
	•	TRIGGER_LOG_UI
Фоновый запуск (триггер), лог пишется в файл и UI, без toast.
	•	TRIGGER_UI
Фоновый запуск, только UI-лог, без файла и toast.
	•	TRIGGER_SILENT
Фоновый запуск, полностью тихий, лог только в консоль.

	Logging (TNLog)

Логгер настраивается только во время инициации.

Рабочий код использует читаемые команды:

TNLog.info('message')
TNLog.success('message')
TNLog.alert('message')
TNLog.error(error)

Особенности:
•	лог всегда выводится в console;
•	лог буферизируется и сбрасывается один раз (TNLog.flush());
•	логгер никогда не должен останавливать выполнение скрипта;
•	UI и toast используются только если это разрешено контекстом.

IMPORTANT:
Every script MUST call `TNLog.flush()` in a `finally` block.
Failure to do so will result in lost log records.

Logs are buffered in memory and written only during flush().
This significantly improves performance and reduces quota usage.

	Public and Internal API

The library exposes a limited set of public methods intended
to be used by consumer scripts.

Public API:
•	TNInitiation()
•	TNLog.info()
•	TNLog.success()
•	TNLog.alert()
•	TNLog.error()
•	TNLog.flush()

Internal helpers:
•	detectCallerFunctionName()
•	safeGetActiveUser()
•	safeGetEffectiveUser()
•	TNLog.configure()

Internal methods MUST NOT be called directly.

	Script Templates

Файл ScriptTemplate.gs содержит эталонные шаблоны скриптов
для всех поддерживаемых сценариев запуска.

Шаблоны:
•	не содержат бизнес-логики;
•	не используют Spreadsheet UI напрямую;
•	не конфигурируют логгер вручную;
•	всегда имеют try / catch / finally с TNLog.flush().

	Правила разработки
•	Никаких логов до TNInitiation()
•	Никаких прямых вызовов toast / UI вне TNLog
•	Все фабрики получают TNSV (контекст)
•	Любая ошибка должна быть безопасно залогирована