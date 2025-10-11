# Express vs NestJS - Side-by-Side Comparison

This document shows how the same functionality is implemented in both Express and NestJS versions.

## 1. Application Bootstrap

### Express (`src/server.ts`)
```typescript
import createApp from "@/common/config/app";

const app = createApp();
const PORT = env.PORT;

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

async function bootstrap() {
  await connectDatabaseOrExit();
  initializeMonitoringServices();
  registerFallbackHandlers(app);
  await startHttpServer();
}

bootstrap();
```

### NestJS (`src/main.ts`)
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Middleware
  app.use(helmet());
  app.use(compression());
  app.enableCors(corsOptions);
  
  // Global setup
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  await app.listen(PORT);
}

bootstrap();
```

## 2. Module Structure

### Express (`src/index.ts`)
```typescript
export const mountRoutes = (app: Application) => {
  const apiRouter = Router();
  apiRouter.use("/auth", authR);
  apiRouter.use("/users", userR);
  apiRouter.use("/events", eventLogR);
  apiRouter.use("/languages", languageR);
  apiRouter.use("/images", imageR);
  apiRouter.use("/monitoring", monitoringR);
  app.use("/api/v1", apiRouter);
};
```

### NestJS (`src/app.module.ts`)
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({ ... }),
    ThrottlerModule.forRootAsync({ ... }),
    AuthModule,
    UserModule,
    LanguageModule,
    EventLogModule,
    ImageModule,
    MonitoringModule,
  ],
})
export class AppModule {}
```

## 3. Controller Example - Auth Login

### Express (`src/common/modules/User/auth/auth.route.ts` + `auth.controller.ts`)
```typescript
// Route
router.post("/login", 
  authRateLimiter, 
  authController.login.validator, 
  authController.login.handler
);

// Controller
const loginHandler: RequestHandler = expressAsyncHandler(
  async (req, res) => {
    const result = await authService.login(req);
    ApiSuccess.send(res, "OK", "User logged in successfully", result);
  }
);
```

### NestJS (`src/common/modules/User/auth/auth.controller.nest.ts`)
```typescript
@Controller('auth')
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const result = await this.authService.login(loginDto, req);
    return {
      statusCode: HttpStatus.OK,
      statusMessage: 'OK',
      message: 'User logged in successfully',
      data: result,
    };
  }
}
```

## 4. Service Example

### Express (`src/common/modules/User/auth/auth.service.ts`)
```typescript
export const login = async (req: Request) => {
  const { email, password } = req.body;
  
  const user = await UserModel.findOne({ email }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError("Invalid credentials", "UNAUTHORIZED");
  }
  
  const token = createSecureToken({ id: user._id });
  return { token, user };
};
```

### NestJS (`src/common/modules/User/auth/auth.service.nest.ts`)
```typescript
@Injectable()
export class AuthService {
  async login(dto: LoginDto, req: Request) {
    // Adapter pattern: wraps Express service
    const mockReq = { ...req, body: dto } as Request;
    return authServiceExpress.login(mockReq);
  }
}
```

## 5. Validation

### Express (express-validator)
```typescript
export const loginValidator = [
  body("email").isEmail().withMessage("Invalid email"),
  body("password").notEmpty().withMessage("Password is required"),
  validationMiddleware,
];
```

### NestJS (class-validator)
```typescript
export class LoginDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  password!: string;
}
```

## 6. Authentication Middleware/Guard

### Express (`src/common/middleware/auth/index.ts`)
```typescript
const authMiddleware = (...roles: UserRole[]): RequestHandler => {
  return expressAsyncHandler(async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = verifySecureToken(token);
    const user = await UserModel.findById(decoded.id);
    
    if (!allowedRoles.includes(user.role)) {
      throw new ApiError("Forbidden", "FORBIDDEN");
    }
    
    req.user = user;
    next();
  });
};
```

### NestJS (`src/common/guards/auth.guard.ts`)
```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<UserRole[]>(ROLES_KEY, context.getHandler());
    const request = context.switchToHttp().getRequest();
    
    const token = request.headers.authorization?.split(' ')[1];
    const decoded = verifySecureToken(token);
    const user = await UserModel.findById(decoded.id);
    
    if (!allowedRoles.includes(user.role)) {
      throw new ApiError('Forbidden', 'FORBIDDEN');
    }
    
    request.user = user;
    return true;
  }
}

// Usage
@UseGuards(AuthGuard)
@Roles('admin')
async someMethod() { ... }
```

## 7. Error Handling

### Express (`src/common/middleware/globalError.ts`)
```typescript
const globalError = (
  err: ErrorType,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ApiError) {
    return err.send(res);
  }
  
  // Handle other errors...
  res.status(statusCode).json({ ... });
};

app.use(globalError);
```

### NestJS (`src/common/filters/global-exception.filter.ts`)
```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    
    if (exception instanceof ApiError) {
      return exception.send(response);
    }
    
    // Handle other exceptions...
    response.status(statusCode).json({ ... });
  }
}

// Usage in main.ts
app.useGlobalFilters(new GlobalExceptionFilter());
```

## 8. Rate Limiting

### Express
```typescript
import createRateLimiter, { authRateLimiter } from "@/common/utils/api/rateLimiter";

app.use(createRateLimiter());
app.use("/api/v1/auth", authRateLimiter);
```

### NestJS
```typescript
// In AppModule
ThrottlerModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    throttlers: [{
      ttl: configService.get('RATE_LIMIT_WINDOW_MINUTES') * 60 * 1000,
      limit: configService.get('RATE_LIMIT_MAX_REQUESTS'),
    }],
  }),
}),

// In controller
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AuthController { ... }
```

## 9. Database Configuration

### Express (`src/common/config/database.config.ts`)
```typescript
const dbConnection = {
  connect: async () => {
    const conn = await mongoose.connect(env.DB_URL, {
      dbName: env.DB_NAME,
      auth: { username: env.DB_USER, password: env.DB_PASSWORD }
    });
  }
};

await dbConnection.connect();
```

### NestJS (In AppModule)
```typescript
MongooseModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    uri: configService.get('DB_URL'),
    dbName: configService.get('DB_NAME'),
    auth: {
      username: configService.get('DB_USER'),
      password: configService.get('DB_PASSWORD'),
    },
  }),
  inject: [ConfigService],
}),
```

## 10. File Upload

### Express
```typescript
const { upload, processImages } = createImageCenter({
  basePath: "images",
  fieldName: "files",
  maxCount: 20,
});

router.post("/",
  uploadRateLimiter,
  authMiddleware("admin"),
  upload,
  processImages,
  ImageC.upload.handler
);
```

### NestJS
```typescript
@Post()
@UseGuards(AuthGuard)
@Roles('admin')
@Throttle({ default: { limit: 20, ttl: 3600000 } })
@UseInterceptors(FilesInterceptor('files', 20))
async upload(@UploadedFiles() files: Array<Express.Multer.File>, @Req() req: Request) {
  // Manually call Express upload middleware for compatibility
  return new Promise((resolve, reject) => {
    imageCenter.upload(req, res, (err) => {
      if (err) return reject(err);
      imageCenter.processImages(req, res, (err) => {
        if (err) return reject(err);
        ImageC.upload.handler(req, res, (err) => {
          if (err) reject(err);
        });
      });
    });
  });
}
```

## Key Differences Summary

| Aspect | Express | NestJS |
|--------|---------|--------|
| **Architecture** | Functional, middleware-based | Object-oriented, decorator-based |
| **Routing** | Router objects | Controller decorators |
| **Middleware** | Functions in chain | Guards, Interceptors, Pipes |
| **Dependency Injection** | Manual | Built-in IoC container |
| **Validation** | express-validator | class-validator with DTOs |
| **Configuration** | Manual imports | ConfigModule |
| **Modules** | No formal module system | Module decorator |
| **Testing** | Manual setup | Built-in testing utilities |
| **Type Safety** | Good | Excellent (decorators + DI) |
| **Learning Curve** | Lower | Higher |
| **Flexibility** | Very high | High |
| **Structure** | Flexible | Opinionated |

## When to Use Each

### Use Express if:
- You need maximum flexibility
- Team is familiar with Express
- Simple, small application
- Want minimal abstractions

### Use NestJS if:
- Building enterprise application
- Need microservices in future
- Want strong structure and conventions
- Team comes from Angular/Java/C# background
- Need OpenAPI/Swagger documentation
- Building scalable, maintainable app

## Conclusion

Both implementations:
- ✅ Have identical functionality
- ✅ Use the same database models
- ✅ Share the same business logic
- ✅ Provide the same API endpoints
- ✅ Are production-ready

The choice depends on your team's needs and preferences!
