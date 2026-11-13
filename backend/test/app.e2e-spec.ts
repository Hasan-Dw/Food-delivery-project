import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { getConnectionToken, getModelToken, MongooseModule } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import { Types } from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuthModule } from '../src/auth/auth.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ApprovedAccountGuard } from '../src/common/guards/approved-account.guard';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { AppValidationPipe } from '../src/common/pipes/app-validation.pipe';
import configuration, { validateEnvironment } from '../src/config/configuration';
import {
  AccountStatus,
  RestaurantStatus,
  UserRole,
} from '../src/common/enums/user.enum';
import { MenuItemsModule } from '../src/menu-items/menu-items.module';
import { RestaurantsModule } from '../src/restaurants/restaurants.module';
import {
  Restaurant,
  type RestaurantDocument,
} from '../src/restaurants/schemas';
import { User, type UserDocument } from '../src/users/schemas/user.schema';
import { UsersModule } from '../src/users/users.module';
import { PromotionsModule } from '../src/promotions/promotions.module';
import { CheckoutModule } from '../src/checkout/checkout.module';
import { DeliveriesModule } from '../src/deliveries/deliveries.module';
import { DriversModule } from '../src/drivers/drivers.module';
import { OrdersModule } from '../src/orders/orders.module';
import { TrackingModule } from '../src/tracking/tracking.module';
import {
  Delivery,
  type DeliveryDocument,
} from '../src/deliveries/schemas/delivery.schema';
import { Order, type OrderDocument } from '../src/orders/schemas/order.schema';
import {
  Promotion,
  PromotionRedemption,
  type PromotionDocument,
  type PromotionRedemptionDocument,
} from '../src/promotions/schemas/promotion.schema';
import {
  DriverProfile,
  type DriverProfileDocument,
} from '../src/users/schemas/driver-profile.schema';
import { UsersService } from '../src/users/users.service';
import { findMongodBinary } from './mongo-binary';

interface RegisteredSession {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    accountStatus: string;
    restaurantId?: string;
    driverId?: string;
  };
}

const PASSWORD = 'Password123';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

describe('Savora API (e2e)', () => {
  let mongod: MongoMemoryServer;
  let app: INestApplication;
  let connection: Connection;
  let userModel: Model<UserDocument>;
  let restaurantModel: Model<RestaurantDocument>;
  let deliveryModel: Model<DeliveryDocument>;
  let orderModel: Model<OrderDocument>;
  let driverModel: Model<DriverProfileDocument>;
  let promotionModel: Model<PromotionDocument>;
  let redemptionModel: Model<PromotionRedemptionDocument>;
  let usersService: UsersService;

  beforeAll(async () => {
    // A locally installed mongod avoids downloading a binary from
    // fastdl.mongodb.org, which is not reachable from every network.
    const systemBinary = findMongodBinary();
    if (systemBinary) process.env.MONGOMS_SYSTEM_BINARY_VERSION_CHECK = 'false';

    mongod = await MongoMemoryServer.create(
      systemBinary ? { binary: { systemBinary } } : { binary: { version: '7.0.14' } },
    );
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = mongod.getUri('savora-test');
    process.env.JWT_ACCESS_SECRET = 'test-secret-value-that-is-long-enough-for-validation';
    process.env.JWT_ACCESS_EXPIRES_IN = '1h';
    process.env.CORS_ORIGINS = 'http://localhost:5173';
    // The e2e app is created with `init()` and never listens on a socket, so
    // snapshots correctly report that no live channel is attached.
    process.env.LIVE_TRACKING_ENABLED = 'false';
    process.env.ROUTING_ENABLED = 'false';

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          cache: false,
          ignoreEnvFile: true,
          load: [configuration],
          validate: validateEnvironment,
        }),
        MongooseModule.forRoot(process.env.MONGODB_URI, { autoIndex: true }),
        UsersModule,
        RestaurantsModule,
        MenuItemsModule,
        AuthModule,
        PromotionsModule,
        CheckoutModule,
        DeliveriesModule,
        DriversModule,
        OrdersModule,
        TrackingModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_GUARD, useClass: ApprovedAccountGuard },
        { provide: APP_PIPE, useClass: AppValidationPipe },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    connection = app.get<Connection>(getConnectionToken());
    userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
    restaurantModel = app.get<Model<RestaurantDocument>>(
      getModelToken(Restaurant.name),
    );
    deliveryModel = app.get<Model<DeliveryDocument>>(getModelToken(Delivery.name));
    orderModel = app.get<Model<OrderDocument>>(getModelToken(Order.name));
    driverModel = app.get<Model<DriverProfileDocument>>(
      getModelToken(DriverProfile.name),
    );
    promotionModel = app.get<Model<PromotionDocument>>(getModelToken(Promotion.name));
    redemptionModel = app.get<Model<PromotionRedemptionDocument>>(
      getModelToken(PromotionRedemption.name),
    );
    usersService = app.get(UsersService);
  }, 180000);

  afterAll(async () => {
    await app?.close();
    await mongod?.stop();
  });

  beforeEach(async () => {
    for (const model of Object.values(connection.models)) {
      await model.deleteMany({});
    }
  });

  async function registerCustomer(email = uniqueEmail('customer')): Promise<RegisteredSession> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Maya Chen',
        email,
        password: PASSWORD,
        phone: '+1 718 555 0142',
        role: 'CUSTOMER',
      })
      .expect(201);

    return response.body.data as RegisteredSession;
  }

  async function registerOwner(
    email = uniqueEmail('owner'),
    restaurantName = 'Test Kitchen',
  ): Promise<RegisteredSession> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Owner Example',
        email,
        password: PASSWORD,
        role: 'RESTAURANT_OWNER',
        restaurant: {
          name: restaurantName,
          address: '1 Test Street, Brooklyn, NY',
          phone: '+1 718 555 0100',
          description: 'A test kitchen.',
        },
      })
      .expect(201);

    return response.body.data as RegisteredSession;
  }

  async function approveUser(email: string): Promise<void> {
    await userModel.updateOne(
      { email: email.toLowerCase() },
      { $set: { accountStatus: AccountStatus.APPROVED } },
    );
  }

  it('rejects malformed registration payloads without creating an account', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'A',
        email: 'not-an-email',
        password: 'short',
        role: 'ADMIN',
      })
      .expect(400);

    expect(response.body.code).toBe('validation_failed');
    expect(response.body.details.email).toBeDefined();
    expect(response.body.details.password).toBeDefined();
    expect(response.body.details.role).toBeDefined();
    expect(await userModel.countDocuments()).toBe(0);
  });

  it('requires restaurant details when registering a restaurant owner', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Owner Without Restaurant',
        email: uniqueEmail('owner'),
        password: PASSWORD,
        role: 'RESTAURANT_OWNER',
      })
      .expect(400);

    expect(response.body.code).toBe('validation_failed');
    expect(response.body.details.restaurant).toBeDefined();
    expect(await userModel.countDocuments()).toBe(0);
  });

  it('registers customers as approved and never returns a password hash', async () => {
    const email = uniqueEmail('customer');
    const session = await registerCustomer(email);

    expect(session.user.accountStatus).toBe(AccountStatus.APPROVED);
    expect(session.user.role).toBe(UserRole.CUSTOMER);
    expect(session.accessToken).toBeTruthy();
    expect(session.user).not.toHaveProperty('passwordHash');

    const stored = await userModel.findOne({ email }).select('+passwordHash').lean();
    expect(stored?.passwordHash).toBeTruthy();
    expect(stored?.passwordHash).not.toBe(PASSWORD);
  });

  it('rejects duplicate registration emails with a conflict', async () => {
    const email = uniqueEmail('customer');
    await registerCustomer(email);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ fullName: 'Maya Chen', email, password: PASSWORD, role: 'CUSTOMER' })
      .expect(409);

    expect(response.body.code).toBe('email_taken');
  });

  it('logs in with valid credentials and rejects a wrong password', async () => {
    const email = uniqueEmail('customer');
    await registerCustomer(email);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);

    expect(login.body.data.accessToken).toBeTruthy();
    expect(login.body.data.user.email).toBe(email);

    const rejected = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword1' })
      .expect(401);

    expect(rejected.body.code).toBe('invalid_credentials');
  });

  it('protects profile routes and rejects protected profile fields', async () => {
    const session = await registerCustomer();

    await request(app.getHttpServer()).get('/api/v1/me').expect(401);

    const profile = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set(bearer(session.accessToken))
      .expect(200);
    expect(profile.body.data.id).toBe(session.user.id);

    const roleAttempt = await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set(bearer(session.accessToken))
      .send({ role: 'ADMIN' })
      .expect(400);
    expect(roleAttempt.body.code).toBe('validation_failed');
    expect(roleAttempt.body.details.role).toBeDefined();

    const statusAttempt = await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set(bearer(session.accessToken))
      .send({ accountStatus: 'APPROVED' })
      .expect(400);
    expect(statusAttempt.body.code).toBe('validation_failed');

    const updated = await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set(bearer(session.accessToken))
      .send({ fullName: 'Maya Updated' })
      .expect(200);
    expect(updated.body.data.fullName).toBe('Maya Updated');
    expect(updated.body.data.role).toBe(UserRole.CUSTOMER);
  });

  it('returns a fresh session for an authenticated token', async () => {
    const session = await registerCustomer();

    const refreshed = await request(app.getHttpServer())
      .get('/api/v1/auth/session')
      .set(bearer(session.accessToken))
      .expect(200);

    expect(refreshed.body.data.accessToken).toBeTruthy();
    expect(refreshed.body.data.user.id).toBe(session.user.id);
  });

  it('keeps restaurant owners and drivers pending until approval', async () => {
    const owner = await registerOwner();
    expect(owner.user.accountStatus).toBe(AccountStatus.PENDING_APPROVAL);
    expect(owner.user.restaurantId).toBeTruthy();

    const mine = await request(app.getHttpServer())
      .get('/api/v1/restaurants/mine')
      .set(bearer(owner.accessToken))
      .expect(200);
    expect(mine.body.data).toHaveLength(1);

    const blocked = await request(app.getHttpServer())
      .post('/api/v1/restaurants')
      .set(bearer(owner.accessToken))
      .send({ name: 'Second Kitchen', address: { line1: '2 Test Street' } })
      .expect(403);
    expect(blocked.body.code).toBe('account_not_approved');

    const driver = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Driver Example',
        email: uniqueEmail('driver'),
        password: PASSWORD,
        role: 'DRIVER',
        driver: {
          phone: '+1 917 555 0119',
          serviceArea: 'Brooklyn',
          vehicle: 'bike',
        },
      })
      .expect(201);

    expect(driver.body.data.user.accountStatus).toBe(AccountStatus.PENDING_APPROVAL);
    expect(driver.body.data.user.driverId).toBeTruthy();
  });

  it('enforces role authorization for restaurant creation', async () => {
    const customer = await registerCustomer();

    const response = await request(app.getHttpServer())
      .post('/api/v1/restaurants')
      .set(bearer(customer.accessToken))
      .send({ name: 'Customer Kitchen', address: { line1: '3 Test Street' } })
      .expect(403);

    expect(response.body.code).toBe('forbidden');
  });

  it('prevents an owner from managing another owner’s restaurant', async () => {
    const ownerA = await registerOwner(uniqueEmail('owner-a'), 'Kitchen A');
    const ownerB = await registerOwner(uniqueEmail('owner-b'), 'Kitchen B');
    await approveUser(ownerA.user.email);
    await approveUser(ownerB.user.email);

    const hijack = await request(app.getHttpServer())
      .patch(`/api/v1/restaurants/${ownerA.user.restaurantId}`)
      .set(bearer(ownerB.accessToken))
      .send({ tagline: 'Hijacked' })
      .expect(403);
    expect(hijack.body.code).toBe('restaurant_not_owned');

    const own = await request(app.getHttpServer())
      .patch(`/api/v1/restaurants/${ownerA.user.restaurantId}`)
      .set(bearer(ownerA.accessToken))
      .send({ tagline: 'Our own tagline' })
      .expect(200);
    expect(own.body.data.tagline).toBe('Our own tagline');
  });

  it('hides pending restaurants from public discovery', async () => {
    const owner = await registerOwner();
    const restaurantId = owner.user.restaurantId as string;

    await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurantId}`)
      .expect(404);

    await restaurantModel.updateOne(
      { _id: restaurantId },
      { $set: { status: RestaurantStatus.APPROVED } },
    );

    const visible = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurantId}`)
      .expect(200);
    expect(visible.body.data.id).toBe(restaurantId);

    const list = await request(app.getHttpServer())
      .get('/api/v1/restaurants')
      .expect(200);
    expect(list.body.data.total).toBe(1);
  });

  it('enforces menu ownership and availability management', async () => {
    const ownerA = await registerOwner(uniqueEmail('owner-a'), 'Menu Kitchen A');
    const ownerB = await registerOwner(uniqueEmail('owner-b'), 'Menu Kitchen B');
    await approveUser(ownerA.user.email);
    await approveUser(ownerB.user.email);
    await restaurantModel.updateOne(
      { _id: ownerA.user.restaurantId },
      { $set: { status: RestaurantStatus.APPROVED } },
    );

    const categories = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${ownerA.user.restaurantId}/menu-categories`)
      .expect(200);
    expect(categories.body.data.length).toBeGreaterThan(0);
    const categoryId = categories.body.data[0].id as string;

    const created = await request(app.getHttpServer())
      .post('/api/v1/menu-items')
      .set(bearer(ownerA.accessToken))
      .send({
        restaurantId: ownerA.user.restaurantId,
        categoryId,
        name: 'Test Dish',
        description: 'A dish created by the owning restaurant.',
        price: 12.5,
        imageKey: 'dish-smash-burger',
      })
      .expect(201);
    expect(created.body.data.price).toBe(12.5);
    const itemId = created.body.data.id as string;

    const crossRestaurant = await request(app.getHttpServer())
      .post('/api/v1/menu-items')
      .set(bearer(ownerB.accessToken))
      .send({
        restaurantId: ownerA.user.restaurantId,
        categoryId,
        name: 'Not Allowed',
        description: 'This must be rejected.',
        price: 10,
        imageKey: 'dish-smash-burger',
      })
      .expect(403);
    expect(crossRestaurant.body.code).toBe('restaurant_not_owned');

    const crossUpdate = await request(app.getHttpServer())
      .patch(`/api/v1/menu-items/${itemId}`)
      .set(bearer(ownerB.accessToken))
      .send({ price: 1 })
      .expect(403);
    expect(crossUpdate.body.code).toBe('restaurant_not_owned');

    const crossDelete = await request(app.getHttpServer())
      .delete(`/api/v1/menu-items/${itemId}`)
      .set(bearer(ownerB.accessToken))
      .expect(403);
    expect(crossDelete.body.code).toBe('restaurant_not_owned');

    const availability = await request(app.getHttpServer())
      .patch(`/api/v1/menu-items/${itemId}/availability`)
      .set(bearer(ownerA.accessToken))
      .send({ available: false })
      .expect(200);
    expect(availability.body.data.available).toBe(false);

    const publicItem = await request(app.getHttpServer())
      .get(`/api/v1/menu-items/${itemId}`)
      .expect(200);
    expect(publicItem.body.data.id).toBe(itemId);

    const publicList = await request(app.getHttpServer())
      .get('/api/v1/menu-items')
      .query({ restaurantId: ownerA.user.restaurantId })
      .expect(200);
    expect(publicList.body.data.total).toBe(1);
  });

  /* ── Phase 2: orders, deliveries, checkout and promotions ─────────────── */

  async function setupRestaurantWithMenu(
    price = 12.5,
  ): Promise<{ owner: RegisteredSession; restaurantId: string; itemId: string }> {
    const owner = await registerOwner(uniqueEmail('p2-owner'), 'Phase 2 Kitchen');
    await approveUser(owner.user.email);
    const restaurantId = owner.user.restaurantId as string;

    await restaurantModel.updateOne(
      { _id: restaurantId },
      {
        $set: {
          status: RestaurantStatus.APPROVED,
          isOpen: true,
          minOrder: 0,
          deliveryFee: 3,
          estimatedDeliveryMinutes: [20, 30],
          'address.coordinates': { lat: 40.7178, lng: -73.9573 },
        },
      },
    );

    const categories = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurantId}/menu-categories`)
      .expect(200);
    const categoryId = categories.body.data[0].id as string;

    const created = await request(app.getHttpServer())
      .post('/api/v1/menu-items')
      .set(bearer(owner.accessToken))
      .send({
        restaurantId,
        categoryId,
        name: 'Phase 2 Bowl',
        description: 'A dish used by the Phase 2 checkout tests.',
        price,
        imageKey: 'dish-smash-burger',
      })
      .expect(201);

    return { owner, restaurantId, itemId: created.body.data.id as string };
  }

  async function registerDriverSession(
    serviceArea = 'All boroughs',
  ): Promise<RegisteredSession & { driverId: string }> {
    const email = uniqueEmail('p2-driver');
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sam Rivera',
        email,
        password: PASSWORD,
        role: 'DRIVER',
        driver: {
          phone: '+1 917 555 0119',
          serviceArea,
          vehicle: 'scooter',
        },
      })
      .expect(201);

    await approveUser(email);
    const session = response.body.data as RegisteredSession;
    const driverId = session.user.driverId as string;

    // Assignment ranks by real GPS freshness, so a usable driver always has a
    // recent location near the test restaurant.
    await driverModel.updateOne(
      { _id: driverId },
      {
        $set: {
          accountStatus: AccountStatus.APPROVED,
          availability: 'AVAILABLE',
          serviceArea: 'All boroughs',
          lastLocation: {
            lat: 40.719 + Math.random() * 0.004,
            lng: -73.956 + Math.random() * 0.004,
            updatedAt: new Date(),
          },
        },
      },
    );

    return { ...session, driverId };
  }

  async function loginAsAdmin(): Promise<RegisteredSession> {
    const email = uniqueEmail('p2-admin');
    await usersService.create({
      email,
      password: PASSWORD,
      fullName: 'Phase Two Admin',
      role: UserRole.ADMIN,
      accountStatus: AccountStatus.APPROVED,
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);

    return response.body.data as RegisteredSession;
  }

  function orderPayload(
    restaurantId: string,
    itemId: string,
    idempotencyKey: string,
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      idempotencyKey,
      restaurantId,
      items: [{ productId: itemId, quantity: 2, selectedOptions: [] }],
      deliveryAddress: {
        label: 'Home',
        line1: '214 Bedford Avenue',
        city: 'Brooklyn',
        state: 'NY',
        postalCode: '11211',
        country: 'USA',
        lat: 40.7178,
        lng: -73.9573,
      },
      paymentMethodId: 'cash-on-delivery',
      customerName: 'Maya Chen',
      customerPhone: '+1 718 555 0142',
      ...extra,
    };
  }

  async function placeOrder(
    token: string,
    restaurantId: string,
    itemId: string,
    extra: Record<string, unknown> = {},
  ) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(bearer(token))
      .send(orderPayload(restaurantId, itemId, `p2-${Date.now()}-${Math.random()}`, extra))
      .expect(201);
    return response.body.data as {
      id: string;
      status: string;
      deliveryId?: string;
      totals: { subtotal: number; total: number; discount: number };
      couponCode?: string;
      items: Array<{ name: string; unitPrice: number }>;
    };
  }

  async function advanceOrder(
    ownerToken: string,
    orderId: string,
    actions: string[],
  ): Promise<void> {
    for (const action of actions) {
      await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/transition`)
        .set(bearer(ownerToken))
        .send({ action })
        .expect(201);
    }
  }

  it('prices checkout server-side and snapshots purchased items', async () => {
    const { owner, restaurantId, itemId } = await setupRestaurantWithMenu(12.5);
    const customer = await registerCustomer();

    const quote = await request(app.getHttpServer())
      .post('/api/v1/checkout/quote')
      .set(bearer(customer.accessToken))
      .send({
        restaurantId,
        items: [{ productId: itemId, quantity: 2, selectedOptions: [] }],
      })
      .expect(201);

    expect(quote.body.data.subtotal).toBe(25);
    expect(quote.body.data.deliveryFee).toBe(3);
    expect(quote.body.data.serviceFee).toBe(2.5);
    expect(quote.body.data.total).toBe(30.5);

    const order = await placeOrder(customer.accessToken, restaurantId, itemId);
    expect(order.items[0]).toMatchObject({ name: 'Phase 2 Bowl', unitPrice: 12.5 });
    expect(order.totals.total).toBe(30.5);
    expect(order.deliveryId).toBeTruthy();

    // The delivery exists immediately, awaiting assignment.
    const delivery = await request(app.getHttpServer())
      .get(`/api/v1/deliveries/by-order/${order.id}`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(delivery.body.data.status).toBe('PENDING_ASSIGNMENT');
    expect(delivery.body.data.driverId).toBeNull();

    // A later menu price change must not rewrite history.
    await request(app.getHttpServer())
      .patch(`/api/v1/menu-items/${itemId}`)
      .set(bearer(owner.accessToken))
      .send({ price: 99 })
      .expect(200);

    const reloaded = await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(reloaded.body.data.items[0].unitPrice).toBe(12.5);
    expect(reloaded.body.data.totals.total).toBe(30.5);
  });

  it('is idempotent for a repeated checkout key and rejects unknown fields', async () => {
    const { restaurantId, itemId } = await setupRestaurantWithMenu();
    const customer = await registerCustomer();
    const key = `p2-idem-${Date.now()}`;
    const payload = orderPayload(restaurantId, itemId, key);

    const first = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(bearer(customer.accessToken))
      .send(payload)
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(bearer(customer.accessToken))
      .send(payload)
      .expect(201);

    expect(second.body.data.id).toBe(first.body.data.id);
    expect(await orderModel.countDocuments()).toBe(1);

    const rejected = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(bearer(customer.accessToken))
      .send({
        ...orderPayload(restaurantId, itemId, `p2-bad-${Date.now()}`),
        totals: { total: 1 },
      })
      .expect(400);
    expect(rejected.body.code).toBe('validation_failed');
    expect(rejected.body.details.totals).toBeDefined();
  });

  it('runs the order and delivery lifecycle, completing the order on delivery', async () => {
    const { owner, restaurantId, itemId } = await setupRestaurantWithMenu();
    const customer = await registerCustomer();
    const driver = await registerDriverSession();

    const order = await placeOrder(customer.accessToken, restaurantId, itemId);

    await advanceOrder(owner.accessToken, order.id, ['ACCEPT', 'PREPARE', 'READY']);

    const assigned = await request(app.getHttpServer())
      .get(`/api/v1/deliveries/by-order/${order.id}`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(assigned.body.data.status).toBe('ASSIGNED');
    expect(assigned.body.data.driverId).toBe(driver.driverId);
    expect(assigned.body.data.estimatedArrivalAt).toBeTruthy();

    const deliveryId = assigned.body.data.id as string;

    // A driver cannot see or advance another driver's delivery.
    const otherDriver = await registerDriverSession();
    const forbidden = await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${deliveryId}/transition`)
      .set(bearer(otherDriver.accessToken))
      .send({ action: 'PICK_UP' })
      .expect(403);
    expect(forbidden.body.code).toBe('forbidden');

    for (const action of ['PICK_UP', 'START_TRANSIT', 'DELIVER']) {
      await request(app.getHttpServer())
        .post(`/api/v1/deliveries/${deliveryId}/transition`)
        .set(bearer(driver.accessToken))
        .send({ action })
        .expect(201);
    }

    const completed = await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(completed.body.data.status).toBe('COMPLETED');
    expect(completed.body.data.completedAt).toBeTruthy();

    const released = await driverModel.findById(driver.driverId).lean();
    expect(released?.availability).toBe('AVAILABLE');
    expect(released?.activeDeliveryId).toBeNull();
    expect(released?.completedDeliveries).toBe(1);

    const tracking = await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}/tracking`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(tracking.body.data.live).toBe(false);
    expect(tracking.body.data.deliveryStatus).toBe('DELIVERED');
    expect(tracking.body.data.progress).toBe(1);

    // Tracking is scoped to the customer, assigned driver, owner and admin.
    const outsider = await registerCustomer();
    await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}/tracking`)
      .set(bearer(outsider.accessToken))
      .expect(403);
  });

  it('prevents double assignment and supports unassign then reassign', async () => {
    const { owner, restaurantId, itemId } = await setupRestaurantWithMenu();
    const customer = await registerCustomer();
    const driverOne = await registerDriverSession();
    const admin = await loginAsAdmin();

    const order = await placeOrder(customer.accessToken, restaurantId, itemId);
    await advanceOrder(owner.accessToken, order.id, ['ACCEPT', 'PREPARE', 'READY']);

    const first = await request(app.getHttpServer())
      .get(`/api/v1/deliveries/by-order/${order.id}`)
      .set(bearer(customer.accessToken))
      .expect(200);
    const deliveryId = first.body.data.id as string;

    // A second READY order cannot take the same busy driver.
    const secondOrder = await placeOrder(customer.accessToken, restaurantId, itemId);
    await advanceOrder(owner.accessToken, secondOrder.id, ['ACCEPT', 'PREPARE', 'READY']);
    const secondDelivery = await request(app.getHttpServer())
      .get(`/api/v1/deliveries/by-order/${secondOrder.id}`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(secondDelivery.body.data.status).toBe('PENDING_ASSIGNMENT');

    const conflict = await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${secondDelivery.body.data.id}/assign`)
      .set(bearer(admin.accessToken))
      .send({ driverId: driverOne.driverId })
      .expect(409);
    expect(conflict.body.code).toBe('driver_unavailable');

    const unassigned = await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${deliveryId}/unassign`)
      .set(bearer(admin.accessToken))
      .send({ reason: 'Driver had a flat tyre.' })
      .expect(201);
    expect(unassigned.body.data.status).toBe('PENDING_ASSIGNMENT');
    expect(unassigned.body.data.driverId).toBeNull();

    // The order is untouched by a delivery release.
    const stillReady = await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(stillReady.body.data.status).toBe('READY');

    const driverTwo = await registerDriverSession();

    // Put the delivery back with the first driver before testing a swap.
    await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${deliveryId}/assign`)
      .set(bearer(admin.accessToken))
      .send({ driverId: driverOne.driverId })
      .expect(201);

    const reassigned = await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${deliveryId}/reassign`)
      .set(bearer(admin.accessToken))
      .send({ driverId: driverTwo.driverId, reason: 'Faster route.' })
      .expect(201);
    expect(reassigned.body.data.driverId).toBe(driverTwo.driverId);

    const previous = await driverModel.findById(driverOne.driverId).lean();
    expect(previous?.availability).toBe('AVAILABLE');
    expect(previous?.activeDeliveryId).toBeNull();

    const swapEvent = (reassigned.body.data.assignmentHistory as Array<Record<string, unknown>>).find(
      (event) => event.action === 'REASSIGNED',
    );
    expect(swapEvent).toMatchObject({
      previousDriverId: driverOne.driverId,
      newDriverId: driverTwo.driverId,
      source: 'MANUAL',
    });
  });

  it('enforces driver availability rules and assignment permissions', async () => {
    const driver = await registerDriverSession();
    const customer = await registerCustomer();

    const offline = await request(app.getHttpServer())
      .patch(`/api/v1/drivers/${driver.driverId}/availability`)
      .set(bearer(driver.accessToken))
      .send({ availability: 'OFFLINE' })
      .expect(200);
    expect(offline.body.data.availability).toBe('OFFLINE');

    const managed = await request(app.getHttpServer())
      .patch(`/api/v1/drivers/${driver.driverId}/availability`)
      .set(bearer(driver.accessToken))
      .send({ availability: 'ON_DELIVERY' })
      .expect(409);
    expect(managed.body.code).toBe('assignment_managed_by_platform');

    const customerAttempt = await request(app.getHttpServer())
      .get(`/api/v1/drivers/${driver.driverId}`)
      .set(bearer(customer.accessToken))
      .expect(403);
    expect(customerAttempt.body.code).toBe('forbidden');
  });

  it('validates promotions server-side and tracks redemptions', async () => {
    const { restaurantId, itemId } = await setupRestaurantWithMenu();
    const customer = await registerCustomer();
    const admin = await loginAsAdmin();

    const created = await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(bearer(admin.accessToken))
      .send({
        code: 'P2TWENTY',
        title: 'Phase 2 discount',
        subtitle: 'Twenty percent off.',
        description: 'A test promotion.',
        discountType: 'PERCENTAGE',
        value: 20,
        minOrder: 10,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        perCustomerLimit: 1,
        usageLimit: 5,
      })
      .expect(201);

    const promotionId = created.body.data.id as string;
    expect(created.body.data.code).toBe('P2TWENTY');

    const preview = await request(app.getHttpServer())
      .post('/api/v1/promotions/validate')
      .set(bearer(customer.accessToken))
      .send({ code: 'P2TWENTY', restaurantId, subtotal: 25 })
      .expect(201);
    expect(preview.body.data).toMatchObject({ valid: true, discount: 5 });

    const quote = await request(app.getHttpServer())
      .post('/api/v1/checkout/quote')
      .set(bearer(customer.accessToken))
      .send({
        restaurantId,
        items: [{ productId: itemId, quantity: 2, selectedOptions: [] }],
        couponCode: 'p2twenty',
      })
      .expect(201);
    expect(quote.body.data.discount).toBe(5);
    expect(quote.body.data.promotion.valid).toBe(true);

    const invalidQuote = await request(app.getHttpServer())
      .post('/api/v1/checkout/quote')
      .set(bearer(customer.accessToken))
      .send({
        restaurantId,
        items: [{ productId: itemId, quantity: 2, selectedOptions: [] }],
        couponCode: 'NOTACODE',
      })
      .expect(201);
    expect(invalidQuote.body.data.promotion.valid).toBe(false);
    expect(invalidQuote.body.data.discount).toBe(0);

    const order = await placeOrder(customer.accessToken, restaurantId, itemId, {
      couponCode: 'P2TWENTY',
    });
    expect(order.couponCode).toBe('P2TWENTY');
    expect(order.totals.discount).toBe(5);
    expect(order.totals.total).toBe(25.5);

    const storedPromotion = await promotionModel.findById(promotionId).lean();
    expect(storedPromotion?.usageCount).toBe(1);
    const redemption = await redemptionModel
      .findOne({ promotionId: new Types.ObjectId(promotionId) })
      .lean();
    expect(redemption).toBeTruthy();
    expect(redemption?.orderId.toString()).toBe(order.id);
    expect(redemption?.discountCents).toBe(500);

    const reused = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(bearer(customer.accessToken))
      .send(
        orderPayload(restaurantId, itemId, `p2-reuse-${Date.now()}`, {
          couponCode: 'P2TWENTY',
        }),
      )
      .expect(409);
    expect(reused.body.code).toBe('promotion_customer_limit');

    const forbidden = await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(bearer(customer.accessToken))
      .send({
        code: 'NOPE',
        title: 'Nope',
        discountType: 'FIXED',
        value: 1,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(403);
    expect(forbidden.body.code).toBe('forbidden');
  });

  /* ── Phase 3: authorization, image uploads and live delivery data ─────── */

  /** Header-only JPEG: enough for the byte signature check. */
  const SMALL_JPEG = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
  ]);

  it('rejects unauthenticated access to every protected surface', async () => {
    const server = () => request(app.getHttpServer());

    const unauthenticated = [
      () => server().get('/api/v1/me'),
      () => server().get('/api/v1/orders'),
      () => server().get('/api/v1/orders/active'),
      () => server().get('/api/v1/deliveries'),
      () => server().post('/api/v1/restaurants/000000000000000000000000/image'),
      () => server().post('/api/v1/menu-items/000000000000000000000000/image'),
      () => server().post('/api/v1/me/profile-image'),
      () => server().put('/api/v1/deliveries/000000000000000000000000/location'),
    ];

    for (const send of unauthenticated) {
      const response = await send().expect(401);
      expect(response.body.code).toBe('unauthorized');
    }
  });

  it('never provisions administrators through public registration', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Sneaky Admin',
        email: uniqueEmail('admin'),
        password: PASSWORD,
        role: 'ADMIN',
      })
      .expect(400);

    expect(response.body.code).toBe('validation_failed');
    expect(response.body.details.role).toBeDefined();
    expect(await userModel.countDocuments({ role: 'ADMIN' })).toBe(0);
  });

  it('validates uploads by content and reports unconfigured image storage', async () => {
    const { owner, restaurantId } = await setupRestaurantWithMenu();
    const endpoint = `/api/v1/restaurants/${restaurantId}/image`;

    const missing = await request(app.getHttpServer())
      .post(endpoint)
      .set(bearer(owner.accessToken))
      .expect(400);
    expect(missing.body.code).toBe('image_required');

    const wrongType = await request(app.getHttpServer())
      .post(endpoint)
      .set(bearer(owner.accessToken))
      .attach('image', Buffer.from('just some text'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      })
      .expect(400);
    expect(wrongType.body.code).toBe('unsupported_image_type');

    // A client-declared JPEG that is not actually a JPEG is rejected.
    const disguised = await request(app.getHttpServer())
      .post(endpoint)
      .set(bearer(owner.accessToken))
      .attach('image', Buffer.from('not really an image'), {
        filename: 'cover.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);
    expect(disguised.body.code).toBe('invalid_image_file');

    const oversized = await request(app.getHttpServer())
      .post(endpoint)
      .set(bearer(owner.accessToken))
      .attach('image', Buffer.alloc(6 * 1024 * 1024, 1), {
        filename: 'huge.jpg',
        contentType: 'image/jpeg',
      })
      .expect(413);
    expect(oversized.body.code).toBe('image_too_large');

    // The bytes are valid, but this environment has no Cloudinary credentials.
    const unconfigured = await request(app.getHttpServer())
      .post(endpoint)
      .set(bearer(owner.accessToken))
      .attach('image', SMALL_JPEG, {
        filename: 'cover.jpg',
        contentType: 'image/jpeg',
      })
      .expect(503);
    expect(unconfigured.body.code).toBe('image_service_unconfigured');
  }, 60000);

  it('scopes restaurant, menu and profile image changes to their owner', async () => {
    const ownerA = await setupRestaurantWithMenu();
    const ownerB = await registerOwner(uniqueEmail('p3-owner'), 'Other Kitchen');
    await approveUser(ownerB.user.email);
    const customer = await registerCustomer();

    const crossCover = await request(app.getHttpServer())
      .post(`/api/v1/restaurants/${ownerA.restaurantId}/image`)
      .set(bearer(ownerB.accessToken))
      .attach('image', SMALL_JPEG, { filename: 'asset.jpg', contentType: 'image/jpeg' })
      .expect(403);
    expect(crossCover.body.code).toBe('restaurant_not_owned');

    const crossLogo = await request(app.getHttpServer())
      .post(`/api/v1/restaurants/${ownerA.restaurantId}/logo`)
      .set(bearer(ownerB.accessToken))
      .attach('image', SMALL_JPEG, { filename: 'asset.jpg', contentType: 'image/jpeg' })
      .expect(403);
    expect(crossLogo.body.code).toBe('restaurant_not_owned');

    const crossItem = await request(app.getHttpServer())
      .post(`/api/v1/menu-items/${ownerA.itemId}/image`)
      .set(bearer(ownerB.accessToken))
      .attach('image', SMALL_JPEG, { filename: 'asset.jpg', contentType: 'image/jpeg' })
      .expect(403);
    expect(crossItem.body.code).toBe('restaurant_not_owned');

    // A customer cannot use the owner-only upload endpoints at all.
    const customerAttempt = await request(app.getHttpServer())
      .post(`/api/v1/restaurants/${ownerA.restaurantId}/image`)
      .set(bearer(customer.accessToken))
      .attach('image', SMALL_JPEG, { filename: 'asset.jpg', contentType: 'image/jpeg' })
      .expect(403);
    expect(customerAttempt.body.code).toBe('forbidden');

    // The profile endpoint has no id parameter: it always targets the token
    // holder, and it reaches real image storage only when configured.
    const profile = await request(app.getHttpServer())
      .post('/api/v1/me/profile-image')
      .set(bearer(customer.accessToken))
      .attach('image', SMALL_JPEG, { filename: 'asset.jpg', contentType: 'image/jpeg' })
      .expect(503);
    expect(profile.body.code).toBe('image_service_unconfigured');
  }, 60000);

  it('skips stale-GPS drivers and accepts location only from the assigned driver', async () => {
    const { owner, restaurantId, itemId } = await setupRestaurantWithMenu();
    const customer = await registerCustomer();
    const staleDriver = await registerDriverSession();
    const secondDriver = await registerDriverSession();

    // Both drivers exist, but neither has a usable recent fix.
    await driverModel.updateOne(
      { _id: staleDriver.driverId },
      { $set: { 'lastLocation.updatedAt': new Date(Date.now() - 60 * 60_000) } },
    );
    await driverModel.updateOne(
      { _id: secondDriver.driverId },
      { $set: { 'lastLocation.updatedAt': new Date(Date.now() - 60 * 60_000) } },
    );

    const order = await placeOrder(customer.accessToken, restaurantId, itemId);
    await advanceOrder(owner.accessToken, order.id, ['ACCEPT', 'PREPARE', 'READY']);

    const pending = await request(app.getHttpServer())
      .get(`/api/v1/deliveries/by-order/${order.id}`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(pending.body.data.status).toBe('PENDING_ASSIGNMENT');

    const admin = await loginAsAdmin();
    const deliveryId = pending.body.data.id as string;

    const noDriver = await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${deliveryId}/auto-assign`)
      .set(bearer(admin.accessToken))
      .send({ force: true })
      .expect(201);
    expect(noDriver.body.data.assigned).toBe(false);
    expect(noDriver.body.data.status).toBe('NO_ELIGIBLE_DRIVER');

    // A fresh fix makes the same driver eligible; the route is still a road
    // distance (labelled estimate while routing is disabled in tests).
    await driverModel.updateOne(
      { _id: staleDriver.driverId },
      {
        $set: {
          lastLocation: {
            lat: 40.7192,
            lng: -73.9561,
            updatedAt: new Date(),
          },
        },
      },
    );

    const assigned = await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${deliveryId}/auto-assign`)
      .set(bearer(admin.accessToken))
      .send({ force: true })
      .expect(201);
    expect(assigned.body.data.assigned).toBe(true);
    expect(assigned.body.data.driverId).toBe(staleDriver.driverId);
    expect(assigned.body.data.etaMinutes).toBeGreaterThan(0);

    const tracking = await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}/tracking`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(tracking.body.data.etaSource).toBe('straight-line');
    expect(tracking.body.data.remainingDistanceKm).toBeGreaterThan(0);
    expect(tracking.body.data.route.points.length).toBeGreaterThanOrEqual(2);
    expect(tracking.body.data.driverLocation.driverId).toBe(staleDriver.driverId);

    // Only the assigned driver may publish a location for this delivery.
    const impostor = await request(app.getHttpServer())
      .put(`/api/v1/deliveries/${deliveryId}/location`)
      .set(bearer(secondDriver.accessToken))
      .send({ lat: 40.72, lng: -73.95 })
      .expect(403);
    expect(impostor.body.code).toBe('forbidden');

    const published = await request(app.getHttpServer())
      .put(`/api/v1/deliveries/${deliveryId}/location`)
      .set(bearer(staleDriver.accessToken))
      .send({ lat: 40.7211, lng: -73.9542, heading: 45 })
      .expect(200);
    expect(published.body.data.driverLocation).toMatchObject({
      lat: 40.7211,
      lng: -73.9542,
      heading: 45,
    });

    const moved = await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}/tracking`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(moved.body.data.driverLocation).toMatchObject({
      lat: 40.7211,
      lng: -73.9542,
    });
  }, 60000);

  it('returns owner analytics calculated from the restaurant orders in MongoDB', async () => {
    const { owner, restaurantId, itemId } = await setupRestaurantWithMenu(12.5);
    const customer = await registerCustomer();

    const completed = await placeOrder(customer.accessToken, restaurantId, itemId);
    const cancelled = await placeOrder(customer.accessToken, restaurantId, itemId);
    await placeOrder(customer.accessToken, restaurantId, itemId);

    await orderModel.updateOne(
      { _id: completed.id },
      { $set: { status: 'COMPLETED', completedAt: new Date() } },
    );
    await orderModel.updateOne(
      { _id: cancelled.id },
      { $set: { status: 'CANCELLED', cancelledAt: new Date() } },
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/restaurants/mine/analytics?range=30d')
      .set(bearer(owner.accessToken))
      .expect(200);

    const analytics = response.body.data;
    expect(analytics.restaurantId).toBe(restaurantId);
    expect(analytics.range).toBe('30d');
    expect(analytics.granularity).toBe('day');
    expect(analytics.series).toHaveLength(30);
    expect(analytics.weeklySales).toHaveLength(8);
    expect(analytics.monthlySales).toHaveLength(12);

    expect(analytics.summary).toMatchObject({
      totalOrders: 3,
      completedOrders: 1,
      cancelledOrders: 1,
      pendingOrders: 1,
      activeOrders: 0,
      revenueGrowthPercent: null,
      previousRevenue: 0,
    });
    expect(analytics.summary.revenue).toBeCloseTo(completed.totals.total, 2);
    expect(analytics.summary.averageOrderValue).toBeCloseTo(completed.totals.total, 2);
    expect(analytics.summary.completionRatePercent).toBeCloseTo(33.3, 1);
    expect(analytics.summary.cancellationRatePercent).toBeCloseTo(33.3, 1);

    expect(analytics.orderDistribution).toEqual(
      expect.arrayContaining([
        { status: 'COMPLETED', count: 1 },
        { status: 'CANCELLED', count: 1 },
        { status: 'PENDING', count: 1 },
      ]),
    );

    expect(analytics.popularItems).toHaveLength(1);
    expect(analytics.popularItems[0]).toMatchObject({
      productId: itemId,
      name: 'Phase 2 Bowl',
      quantitySold: 2,
    });
    expect(analytics.popularItems[0].revenue).toBeCloseTo(
      completed.items[0].unitPrice * 2,
      2,
    );
    expect(analytics.costModel.source).toBe('MOCK_ASSUMPTION');
  }, 60000);

  it('returns zeroed analytics for a restaurant with no orders', async () => {
    const owner = await registerOwner(uniqueEmail('empty-owner'), 'Empty Kitchen');
    await approveUser(owner.user.email);
    const restaurantId = owner.user.restaurantId as string;

    const response = await request(app.getHttpServer())
      .get('/api/v1/restaurants/mine/analytics?range=7d')
      .set(bearer(owner.accessToken))
      .expect(200);

    expect(response.body.data.restaurantId).toBe(restaurantId);
    expect(response.body.data.summary).toMatchObject({
      revenue: 0,
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      averageOrderValue: 0,
      completionRatePercent: 0,
      cancellationRatePercent: 0,
      revenueGrowthPercent: null,
    });
    expect(response.body.data.popularItems).toEqual([]);
    expect(response.body.data.orderDistribution).toEqual([]);
    expect(
      response.body.data.series.every(
        (point: { revenue: number; totalOrders: number }) =>
          point.revenue === 0 && point.totalOrders === 0,
      ),
    ).toBe(true);
  }, 60000);

  it('enforces analytics tenant isolation and the existing admin policy', async () => {
    const ownerA = await setupRestaurantWithMenu();
    const ownerB = await setupRestaurantWithMenu();
    const customer = await registerCustomer();
    const driver = await registerDriverSession();
    const admin = await loginAsAdmin();

    const mine = await request(app.getHttpServer())
      .get('/api/v1/restaurants/mine/analytics')
      .set(bearer(ownerA.owner.accessToken))
      .expect(200);
    expect(mine.body.data.restaurantId).toBe(ownerA.restaurantId);

    const crossTenant = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${ownerB.restaurantId}/analytics`)
      .set(bearer(ownerA.owner.accessToken))
      .expect(403);
    expect(crossTenant.body.code).toBe('restaurant_not_owned');

    const adminRead = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${ownerA.restaurantId}/analytics`)
      .set(bearer(admin.accessToken))
      .expect(200);
    expect(adminRead.body.data.restaurantId).toBe(ownerA.restaurantId);

    await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${ownerA.restaurantId}/analytics`)
      .set(bearer(customer.accessToken))
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${ownerA.restaurantId}/analytics`)
      .set(bearer(driver.accessToken))
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/restaurants/mine/analytics')
      .set(bearer(customer.accessToken))
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/restaurants/mine/analytics')
      .set(bearer(driver.accessToken))
      .expect(403);
  }, 60000);

  it('rejects unbounded or unknown analytics ranges', async () => {
    const { owner } = await setupRestaurantWithMenu();

    await request(app.getHttpServer())
      .get('/api/v1/restaurants/mine/analytics?range=365d')
      .set(bearer(owner.accessToken))
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/restaurants/mine/analytics?range=2020-01-01..2026-01-01')
      .set(bearer(owner.accessToken))
      .expect(400);
  }, 60000);

  it('lets the owner update and persist the restaurant description', async () => {
    const { owner, restaurantId } = await setupRestaurantWithMenu();
    const description =
      'Seasonal Brooklyn cooking with a wood-fired oven and a short, changing menu.';

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/restaurants/${restaurantId}`)
      .set(bearer(owner.accessToken))
      .send({ description })
      .expect(200);
    expect(updated.body.data.description).toBe(description);

    const publicRead = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurantId}`)
      .expect(200);
    expect(publicRead.body.data.description).toBe(description);

    // An unrelated update must not wipe the saved description.
    const unrelated = await request(app.getHttpServer())
      .patch(`/api/v1/restaurants/${restaurantId}`)
      .set(bearer(owner.accessToken))
      .send({ isOpen: false })
      .expect(200);
    expect(unrelated.body.data.description).toBe(description);

    const persisted = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurantId}`)
      .expect(200);
    expect(persisted.body.data.description).toBe(description);
  }, 60000);

  it('scopes description updates to the owning restaurant and allows admins', async () => {
    const ownerA = await setupRestaurantWithMenu();
    const ownerB = await setupRestaurantWithMenu();
    const customer = await registerCustomer();
    const driver = await registerDriverSession();
    const admin = await loginAsAdmin();

    const crossTenant = await request(app.getHttpServer())
      .patch(`/api/v1/restaurants/${ownerA.restaurantId}`)
      .set(bearer(ownerB.owner.accessToken))
      .send({ description: 'Not my restaurant.' })
      .expect(403);
    expect(crossTenant.body.code).toBe('restaurant_not_owned');

    await request(app.getHttpServer())
      .patch(`/api/v1/restaurants/${ownerA.restaurantId}`)
      .set(bearer(customer.accessToken))
      .send({ description: 'Customer edit.' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/v1/restaurants/${ownerA.restaurantId}`)
      .set(bearer(driver.accessToken))
      .send({ description: 'Driver edit.' })
      .expect(403);

    const adminUpdate = await request(app.getHttpServer())
      .patch(`/api/v1/restaurants/${ownerA.restaurantId}`)
      .set(bearer(admin.accessToken))
      .send({ description: 'Admin-reviewed description.' })
      .expect(200);
    expect(adminUpdate.body.data.description).toBe('Admin-reviewed description.');
  }, 60000);

  it('rejects invalid and excessively long restaurant descriptions', async () => {
    const { owner, restaurantId } = await setupRestaurantWithMenu();

    await request(app.getHttpServer())
      .patch(`/api/v1/restaurants/${restaurantId}`)
      .set(bearer(owner.accessToken))
      .send({ description: 'x'.repeat(1001) })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/v1/restaurants/${restaurantId}`)
      .set(bearer(owner.accessToken))
      .send({ description: 42 })
      .expect(400);
  }, 60000);
});
