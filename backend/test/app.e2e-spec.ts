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
import { DeliveriesService } from '../src/deliveries/deliveries.service';
import { AdminModule } from '../src/admin/admin.module';
import { ReviewsModule } from '../src/reviews/reviews.module';
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
  let deliveriesService: DeliveriesService;

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
        AdminModule,
        ReviewsModule,
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
    deliveriesService = app.get(DeliveriesService);
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

  it('persists the default delivery address supplied during customer registration', async () => {
    const email = uniqueEmail('located-customer');
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Located Customer',
        email,
        password: PASSWORD,
        role: 'CUSTOMER',
        defaultAddress: {
          label: 'Home',
          line1: 'Al-Ziraa, 8th Street, building 12',
          city: 'Latakia',
          state: 'Al-Ziraa',
          postalCode: '',
          country: 'Syria',
          isDefault: true,
          coordinates: { lat: 35.5196, lng: 35.7915 },
        },
      })
      .expect(201);

    const addresses = await request(app.getHttpServer())
      .get('/api/v1/me/addresses')
      .set(bearer(response.body.data.accessToken))
      .expect(200);

    expect(addresses.body.data).toHaveLength(1);
    expect(addresses.body.data[0]).toMatchObject({
      label: 'Home',
      city: 'Latakia',
      state: 'Al-Ziraa',
      isDefault: true,
      coordinates: { lat: 35.5196, lng: 35.7915 },
    });
  });

  it('rejects a registration location outside the Latakia service area', async () => {
    const before = await userModel.countDocuments();

    const outside = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Distant Customer',
        email: uniqueEmail('outside'),
        password: PASSWORD,
        role: 'CUSTOMER',
        defaultAddress: {
          label: 'Home',
          line1: '214 Bedford Avenue',
          city: 'Brooklyn',
          state: 'NY',
          postalCode: '11211',
          country: 'USA',
          coordinates: { lat: 40.7192, lng: -73.9561 },
        },
      })
      .expect(400);

    expect(outside.body.code).toBe('out_of_service_area');

    const badPin = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Misplaced Customer',
        email: uniqueEmail('bad-pin'),
        password: PASSWORD,
        role: 'CUSTOMER',
        defaultAddress: {
          label: 'Home',
          line1: 'Al-Ziraa, 8th Street',
          city: 'Latakia',
          state: 'Al-Ziraa',
          postalCode: '',
          country: 'Syria',
          coordinates: { lat: 40.7192, lng: -73.9561 },
        },
      })
      .expect(400);

    expect(badPin.body.code).toBe('out_of_service_area');
    expect(await userModel.countDocuments()).toBe(before);
  });

  it('stores a restaurant owner’s Latakia pin and neighbourhood at registration', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Located Owner',
        email: uniqueEmail('located-owner'),
        password: PASSWORD,
        role: 'RESTAURANT_OWNER',
        restaurant: {
          name: 'Located Kitchen',
          address: 'Al-Ziraa, 8th Street',
          phone: '+963 944 000 200',
          city: 'Latakia',
          state: 'Al-Ziraa',
          postalCode: '',
          country: 'Syria',
          latitude: 35.5196,
          longitude: 35.7915,
        },
      })
      .expect(201);

    const mine = await request(app.getHttpServer())
      .get('/api/v1/restaurants/mine')
      .set(bearer(response.body.data.accessToken))
      .expect(200);

    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0].address).toMatchObject({
      line1: 'Al-Ziraa, 8th Street',
      city: 'Latakia',
      state: 'Al-Ziraa',
      coordinates: { lat: 35.5196, lng: 35.7915 },
    });
  });

  it('rejects a restaurant registration pin outside Latakia', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Distant Owner',
        email: uniqueEmail('distant-owner'),
        password: PASSWORD,
        role: 'RESTAURANT_OWNER',
        restaurant: {
          name: 'Distant Kitchen',
          address: '214 Bedford Avenue',
          phone: '+963 944 000 201',
          city: 'Latakia',
          latitude: 40.7192,
          longitude: -73.9561,
        },
      })
      .expect(400);

    expect(response.body.code).toBe('out_of_service_area');
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
          serviceArea: 'Latakia',
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

  it('publishes a registered restaurant after admin account approval', async () => {
    const owner = await registerOwner();
    const restaurantId = owner.user.restaurantId as string;
    const admin = await loginAsAdmin();

    const before = await request(app.getHttpServer())
      .get('/api/v1/restaurants')
      .expect(200);
    expect(before.body.data.total).toBe(0);

    const ownerRecord = await userModel.findOne({ email: owner.user.email }).exec();
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/accounts/${ownerRecord?._id.toString()}/status`)
      .set(bearer(admin.accessToken))
      .send({ status: AccountStatus.APPROVED })
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurantId}`)
      .expect(200);
    expect(detail.body.data.id).toBe(restaurantId);
    expect(detail.body.data.name).toBe('Test Kitchen');

    const list = await request(app.getHttpServer())
      .get('/api/v1/restaurants')
      .expect(200);
    expect(list.body.data.items.map((item: { id: string }) => item.id)).toContain(
      restaurantId,
    );
  });

  it('publishes restaurants added by an already-approved owner', async () => {
    const owner = await registerOwner();
    const admin = await loginAsAdmin();
    const ownerRecord = await userModel.findOne({ email: owner.user.email }).exec();
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/accounts/${ownerRecord?._id.toString()}/status`)
      .set(bearer(admin.accessToken))
      .send({ status: AccountStatus.APPROVED })
      .expect(200);

    // The JWT still carries the pending account status, so sign in again.
    const session = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: owner.user.email, password: PASSWORD })
      .expect(200);

    const created = await request(app.getHttpServer())
      .post('/api/v1/restaurants')
      .set(bearer(session.body.data.accessToken))
      .send({ name: 'Second Kitchen', address: { line1: '2 Test Street' } })
      .expect(201);

    const stored = await restaurantModel.findById(created.body.data.id).exec();
    expect(stored?.status).toBe(RestaurantStatus.APPROVED);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${created.body.data.id}`)
      .expect(200);
    expect(detail.body.data.name).toBe('Second Kitchen');
  });

  it('hides a restaurant again when the owner account is suspended', async () => {
    const owner = await registerOwner();
    const restaurantId = owner.user.restaurantId as string;
    const admin = await loginAsAdmin();
    const ownerRecord = await userModel.findOne({ email: owner.user.email }).exec();

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/accounts/${ownerRecord?._id.toString()}/status`)
      .set(bearer(admin.accessToken))
      .send({ status: AccountStatus.APPROVED })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurantId}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/accounts/${ownerRecord?._id.toString()}/status`)
      .set(bearer(admin.accessToken))
      .send({ status: AccountStatus.SUSPENDED })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/restaurants/${restaurantId}`)
      .expect(404);
    const list = await request(app.getHttpServer())
      .get('/api/v1/restaurants')
      .expect(200);
    expect(list.body.data.total).toBe(0);
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

  it('lets admins manage restaurant categories and owners only select them', async () => {
    const admin = await loginAsAdmin();
    const owner = await registerOwner();
    await approveUser(owner.user.email);

    // Owners cannot mutate the platform catalog.
    await request(app.getHttpServer())
      .post('/api/v1/restaurant-categories')
      .set(bearer(owner.accessToken))
      .send({ name: 'Owner Category', imageKey: 'category-burgers' })
      .expect(403);

    const created = await request(app.getHttpServer())
      .post('/api/v1/restaurant-categories')
      .set(bearer(admin.accessToken))
      .send({ name: 'Test Category', imageKey: 'category-pizza', sortOrder: 5 })
      .expect(201);
    const categoryId = created.body.data.id as string;
    expect(created.body.data.slug).toBe('test-category');

    // Duplicate names are rejected case-insensitively.
    await request(app.getHttpServer())
      .post('/api/v1/restaurant-categories')
      .set(bearer(admin.accessToken))
      .send({ name: 'test category', imageKey: 'category-pizza' })
      .expect(409);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/restaurant-categories/${categoryId}`)
      .set(bearer(admin.accessToken))
      .send({ name: 'Test Category Renamed', sortOrder: 6 })
      .expect(200);
    expect(updated.body.data.name).toBe('Test Category Renamed');

    // The public catalog exposes the category to guests.
    const publicList = await request(app.getHttpServer())
      .get('/api/v1/restaurant-categories')
      .expect(200);
    expect(
      publicList.body.data.some(
        (category: { id: string }) => category.id === categoryId,
      ),
    ).toBe(true);

    // Assigning the category slug filters public discovery.
    const restaurantId = owner.user.restaurantId as string;
    await restaurantModel.updateOne(
      { _id: restaurantId },
      { $set: { status: RestaurantStatus.APPROVED, categorySlugs: ['test-category'] } },
    );

    const filtered = await request(app.getHttpServer())
      .get('/api/v1/restaurants')
      .query({ category: 'test-category' })
      .expect(200);
    expect(filtered.body.data.items.map((item: { id: string }) => item.id)).toEqual([
      restaurantId,
    ]);

    // A category still referenced by a restaurant cannot be deleted.
    await request(app.getHttpServer())
      .delete(`/api/v1/restaurant-categories/${categoryId}`)
      .set(bearer(admin.accessToken))
      .expect(409);

    // Once unassigned it can be removed.
    await restaurantModel.updateOne(
      { _id: restaurantId },
      { $set: { categorySlugs: [] } },
    );
    await request(app.getHttpServer())
      .delete(`/api/v1/restaurant-categories/${categoryId}`)
      .set(bearer(admin.accessToken))
      .expect(204);
  });

  it('scopes menu categories to the owning restaurant', async () => {
    const ownerA = await registerOwner(uniqueEmail('cat-owner-a'), 'Cat Kitchen A');
    const ownerB = await registerOwner(uniqueEmail('cat-owner-b'), 'Cat Kitchen B');
    await approveUser(ownerA.user.email);
    await approveUser(ownerB.user.email);

    const created = await request(app.getHttpServer())
      .post('/api/v1/restaurant-menu-categories')
      .set(bearer(ownerA.accessToken))
      .send({ name: 'Chef Specials', description: 'Limited menu.' })
      .expect(201);
    const categoryId = created.body.data.id as string;

    const mine = await request(app.getHttpServer())
      .get('/api/v1/restaurant-menu-categories')
      .set(bearer(ownerA.accessToken))
      .expect(200);
    expect(mine.body.data.some((c: { id: string }) => c.id === categoryId)).toBe(true);

    const theirs = await request(app.getHttpServer())
      .get('/api/v1/restaurant-menu-categories')
      .set(bearer(ownerB.accessToken))
      .expect(200);
    expect(theirs.body.data.some((c: { id: string }) => c.id === categoryId)).toBe(false);

    // Owner B cannot rename or delete owner A's section.
    await request(app.getHttpServer())
      .patch(`/api/v1/restaurant-menu-categories/${categoryId}`)
      .set(bearer(ownerB.accessToken))
      .send({ name: 'Hijacked' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/api/v1/restaurant-menu-categories/${categoryId}`)
      .set(bearer(ownerB.accessToken))
      .expect(403);

    // Duplicate names within the same restaurant are rejected.
    await request(app.getHttpServer())
      .post('/api/v1/restaurant-menu-categories')
      .set(bearer(ownerA.accessToken))
      .send({ name: 'chef specials' })
      .expect(409);

    // The same name is allowed for a different restaurant.
    await request(app.getHttpServer())
      .post('/api/v1/restaurant-menu-categories')
      .set(bearer(ownerB.accessToken))
      .send({ name: 'Chef Specials' })
      .expect(201);
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
          'address.coordinates': { lat: 35.5196, lng: 35.7915 },
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
    serviceArea = 'Latakia',
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
          serviceArea: 'Latakia',
          lastLocation: {
            lat: 35.5196 + Math.random() * 0.004,
            lng: 35.7915 + Math.random() * 0.004,
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
        line1: 'Al-Ziraa, 8th Street',
        city: 'Latakia',
        state: 'Latakia',
        postalCode: '',
        country: 'Syria',
        lat: 35.5196,
        lng: 35.7915,
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
      .send(orderPayload(restaurantId, itemId, `p2-${Date.now()}-${Math.random()}`, extra));
    if (response.status !== 201) {
      // Surface the API error instead of only the status in lifecycle failures.
      throw new Error(`Order creation failed (${response.status}): ${JSON.stringify(response.body)}`);
    }
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
      .send(payload);
    if (first.status !== 201) {
      throw new Error(`Order creation failed (${first.status}): ${JSON.stringify(first.body)}`);
    }

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
    const admin = await loginAsAdmin();

    await advanceOrder(owner.accessToken, order.id, ['ACCEPT', 'PREPARE', 'READY']);

    const assigned = await request(app.getHttpServer())
      .get(`/api/v1/deliveries/by-order/${order.id}`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(assigned.body.data.status).toBe('ASSIGNED');
    expect(assigned.body.data.driverId).toBe(driver.driverId);
    expect(assigned.body.data.estimatedArrivalAt).toBeTruthy();

    const deliveryId = assigned.body.data.id as string;
    const beforePickup = await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}/tracking`)
      .set(bearer(driver.accessToken))
      .expect(200);
    expect(beforePickup.body.data.navigationStage).toBe('TO_RESTAURANT');
    expect(beforePickup.body.data.navigationDestination.label).toBe(
      beforePickup.body.data.restaurant.label,
    );
    expect(beforePickup.body.data.route.points.at(-1)).toEqual(
      beforePickup.body.data.restaurant.coordinates,
    );

    // A driver cannot see or advance another driver's delivery.
    const otherDriver = await registerDriverSession();
    const forbidden = await request(app.getHttpServer())
      .post(`/api/v1/deliveries/${deliveryId}/transition`)
      .set(bearer(otherDriver.accessToken))
      .send({ action: 'PICK_UP' })
      .expect(403);
    expect(forbidden.body.code).toBe('forbidden');

    for (const action of ['ARRIVE_AT_RESTAURANT', 'PICK_UP', 'START_TRANSIT', 'DELIVER']) {
      await request(app.getHttpServer())
        .post(`/api/v1/deliveries/${deliveryId}/transition`)
        .set(bearer(driver.accessToken))
        .send({ action })
        .expect(201);
    }

    const afterPickup = await request(app.getHttpServer())
      .get(`/api/v1/orders/${order.id}/tracking`)
      .set(bearer(driver.accessToken))
      .expect(200);
    expect(afterPickup.body.data.navigationStage).toBe('TO_CUSTOMER');
    expect(afterPickup.body.data.navigationDestination.coordinates).toEqual(
      afterPickup.body.data.destination.coordinates,
    );

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

  it('scopes public restaurant discovery to Latakia', async () => {
    const owner = await registerOwner(uniqueEmail('latakia-owner'), 'Latakia Kitchen');
    const restaurantId = owner.user.restaurantId as string;
    await restaurantModel.updateOne(
      { _id: restaurantId },
      { $set: { status: RestaurantStatus.APPROVED } },
    );

    const local = await request(app.getHttpServer())
      .get('/api/v1/restaurants')
      .expect(200);
    expect(local.body.data.total).toBe(1);
    expect(local.body.data.items[0].address.city).toBe('Latakia');

    // An approved restaurant outside the city must never leak into discovery.
    await restaurantModel.updateOne(
      { _id: restaurantId },
      { $set: { 'address.city': 'Brooklyn' } },
    );

    const hidden = await request(app.getHttpServer())
      .get('/api/v1/restaurants')
      .expect(200);
    expect(hidden.body.data.total).toBe(0);

    const featured = await request(app.getHttpServer())
      .get('/api/v1/restaurants/featured')
      .expect(200);
    expect(featured.body.data).toHaveLength(0);
  });

  it('rejects delivery addresses outside the Latakia service area', async () => {
    const { restaurantId, itemId } = await setupRestaurantWithMenu();
    const customer = await registerCustomer();

    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(bearer(customer.accessToken))
      .send({
        ...orderPayload(restaurantId, itemId, `latakia-${Date.now()}`),
        deliveryAddress: {
          label: 'Home',
          line1: '214 Bedford Avenue',
          city: 'Brooklyn',
          state: 'NY',
          postalCode: '11211',
          country: 'USA',
        },
      })
      .expect(400);

    expect(response.body.code).toBe('out_of_service_area');
    expect(await orderModel.countDocuments()).toBe(0);
  });

  it('supports separate restaurant, dish and delivery reviews after delivery', async () => {
    const { owner, restaurantId, itemId } = await setupRestaurantWithMenu();
    const customer = await registerCustomer();
    const otherCustomer = await registerCustomer();
    const driver = await registerDriverSession();
    const admin = await loginAsAdmin();

    const order = await placeOrder(customer.accessToken, restaurantId, itemId);
    await advanceOrder(owner.accessToken, order.id, ['ACCEPT', 'PREPARE', 'READY']);

    const assigned = await request(app.getHttpServer())
      .get(`/api/v1/deliveries/by-order/${order.id}`)
      .set(bearer(customer.accessToken))
      .expect(200);
    const deliveryId = assigned.body.data.id as string;

    for (const action of ['ARRIVE_AT_RESTAURANT', 'PICK_UP', 'START_TRANSIT', 'DELIVER']) {
      await request(app.getHttpServer())
        .post(`/api/v1/deliveries/${deliveryId}/transition`)
        .set(bearer(driver.accessToken))
        .send({ action })
        .expect(201);
    }

    const summaryBefore = await request(app.getHttpServer())
      .get(`/api/v1/reviews/restaurant/${restaurantId}/summary`)
      .expect(200);
    expect(summaryBefore.body.data).toEqual({
      average: 0,
      total: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });

    const restaurantReview = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set(bearer(customer.accessToken))
      .send({ orderId: order.id, type: 'restaurant', rating: 5, comment: 'Excellent shawarma.' })
      .expect(201);
    expect(restaurantReview.body.data).toMatchObject({
      type: 'restaurant',
      rating: 5,
      orderId: order.id,
      restaurantId,
    });

    const duplicate = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set(bearer(customer.accessToken))
      .send({ orderId: order.id, type: 'restaurant', rating: 4 })
      .expect(409);
    expect(duplicate.body.code).toBe('review_exists');

    const dishReview = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set(bearer(customer.accessToken))
      .send({ orderId: order.id, type: 'menu_item', menuItemId: itemId, rating: 5 })
      .expect(201);
    expect(dishReview.body.data.menuItemId).toBe(itemId);

    const notPurchased = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set(bearer(customer.accessToken))
      .send({
        orderId: order.id,
        type: 'menu_item',
        menuItemId: new Types.ObjectId().toString(),
        rating: 5,
      })
      .expect(400);
    expect(notPurchased.body.message).toContain('purchased');

    const deliveryReview = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set(bearer(customer.accessToken))
      .send({
        orderId: order.id,
        type: 'delivery',
        deliveryRating: 4,
        serviceRating: 5,
        comment: 'Fast hand-off.',
      })
      .expect(201);
    expect(deliveryReview.body.data).toMatchObject({
      type: 'delivery',
      deliveryRating: 4,
      serviceRating: 5,
      rating: 4.5,
    });

    const restaurantSummary = await request(app.getHttpServer())
      .get(`/api/v1/reviews/restaurant/${restaurantId}/summary`)
      .expect(200);
    expect(restaurantSummary.body.data).toMatchObject({ average: 5, total: 1 });

    const menuSummary = await request(app.getHttpServer())
      .get(`/api/v1/reviews/menu-item/${itemId}/summary`)
      .expect(200);
    expect(menuSummary.body.data).toMatchObject({ average: 5, total: 1 });

    const driverSummary = await request(app.getHttpServer())
      .get(`/api/v1/reviews/driver/${driver.driverId}/summary`)
      .expect(200);
    expect(driverSummary.body.data).toMatchObject({
      total: 1,
      deliveryAverage: 4,
      serviceAverage: 5,
    });

    const myReviews = await request(app.getHttpServer())
      .get('/api/v1/reviews/my-reviews?perPage=50')
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(myReviews.body.data.total).toBe(3);

    // Editing is restricted to the author (existence is not disclosed).
    await request(app.getHttpServer())
      .patch(`/api/v1/reviews/${restaurantReview.body.data.id}`)
      .set(bearer(otherCustomer.accessToken))
      .send({ rating: 3 })
      .expect(404);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/reviews/${restaurantReview.body.data.id}`)
      .set(bearer(customer.accessToken))
      .send({ rating: 4, comment: 'Updated after a second visit.' })
      .expect(200);
    expect(updated.body.data).toMatchObject({ rating: 4, comment: 'Updated after a second visit.' });

    const updatedSummary = await request(app.getHttpServer())
      .get(`/api/v1/reviews/restaurant/${restaurantId}/summary`)
      .expect(200);
    expect(updatedSummary.body.data).toMatchObject({ average: 4, total: 1 });

    // Delivery review lookup is order-owner only.
    const ownDelivery = await request(app.getHttpServer())
      .get(`/api/v1/reviews/order/${order.id}/delivery`)
      .set(bearer(customer.accessToken))
      .expect(200);
    expect(ownDelivery.body.data.id).toBe(deliveryReview.body.data.id);

    await request(app.getHttpServer())
      .get(`/api/v1/reviews/order/${order.id}/delivery`)
      .set(bearer(otherCustomer.accessToken))
      .expect(403);

    // Admin moderation removes a review from public aggregates and can undo it.
    const hidden = await request(app.getHttpServer())
      .patch(`/api/v1/reviews/admin/${restaurantReview.body.data.id}/hide`)
      .set(bearer(admin.accessToken))
      .send({})
      .expect(200);
    expect(hidden.body.data.review.status).toBe('hidden');

    const hiddenSummary = await request(app.getHttpServer())
      .get(`/api/v1/reviews/restaurant/${restaurantId}/summary`)
      .expect(200);
    expect(hiddenSummary.body.data.total).toBe(0);

    await request(app.getHttpServer())
      .patch(`/api/v1/reviews/admin/${restaurantReview.body.data.id}/restore`)
      .set(bearer(admin.accessToken))
      .send({})
      .expect(200);

    const restoredSummary = await request(app.getHttpServer())
      .get(`/api/v1/reviews/restaurant/${restaurantId}/summary`)
      .expect(200);
    expect(restoredSummary.body.data).toMatchObject({ average: 4, total: 1 });

    const adminQueue = await request(app.getHttpServer())
      .get(
        `/api/v1/reviews/admin?status=visible&restaurantId=${restaurantId}&perPage=50`,
      )
      .set(bearer(admin.accessToken))
      .expect(200);
    expect(adminQueue.body.data.total).toBeGreaterThanOrEqual(3);
    expect(
      adminQueue.body.data.items.every(
        (entry: { status: string; restaurantId: string }) =>
          entry.status === 'visible' && entry.restaurantId === restaurantId,
      ),
    ).toBe(true);

    // Reviews stay tied to delivered orders: a pending order cannot be rated.
    const pendingOrder = await placeOrder(customer.accessToken, restaurantId, itemId);
    await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set(bearer(customer.accessToken))
      .send({ orderId: pendingOrder.id, type: 'restaurant', rating: 5 })
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/api/v1/reviews/${restaurantReview.body.data.id}`)
      .set(bearer(customer.accessToken))
      .expect(200);

    const afterDelete = await request(app.getHttpServer())
      .get(`/api/v1/reviews/restaurant/${restaurantId}/summary`)
      .expect(200);
    expect(afterDelete.body.data.total).toBe(0);
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

    it('keeps order cancellation and delivery cancellation consistent', async () => {
      const { owner, restaurantId, itemId } = await setupRestaurantWithMenu();
      const customer = await registerCustomer();
      const driver = await registerDriverSession();
      const order = await placeOrder(customer.accessToken, restaurantId, itemId);
      const admin = await loginAsAdmin();

      await advanceOrder(owner.accessToken, order.id, ['ACCEPT', 'PREPARE', 'READY']);
      const delivery = await request(app.getHttpServer())
        .get(`/api/v1/deliveries/by-order/${order.id}`)
        .set(bearer(customer.accessToken))
        .expect(200);

      const cancellations = await Promise.all([
        request(app.getHttpServer())
          .post(`/api/v1/orders/${order.id}/transition`)
          .set(bearer(admin.accessToken))
          .send({ action: 'CANCEL' }),
        request(app.getHttpServer())
          .post(`/api/v1/orders/${order.id}/transition`)
          .set(bearer(admin.accessToken))
          .send({ action: 'CANCEL' }),
      ]);
      expect(cancellations.map((response) => response.status).sort()).toEqual([201, 409]);

      const cancelledDelivery = await request(app.getHttpServer())
        .get(`/api/v1/deliveries/${delivery.body.data.id}`)
        .set(bearer(customer.accessToken))
        .expect(200);
      expect(cancelledDelivery.body.data.status).toBe('CANCELLED');

      const cancelledOrder = await request(app.getHttpServer())
        .get(`/api/v1/orders/${order.id}`)
        .set(bearer(customer.accessToken))
        .expect(200);
      expect(cancelledOrder.body.data.status).toBe('CANCELLED');
      expect((await driverModel.findById(driver.driverId).lean())?.activeDeliveryId).toBeNull();
    });

    it('releases driver-failed deliveries without cancelling the order', async () => {
      const { owner, restaurantId, itemId } = await setupRestaurantWithMenu();
      const customer = await registerCustomer();
      const driver = await registerDriverSession();
      const replacement = await registerDriverSession();
      const outsider = await registerDriverSession();
      const order = await placeOrder(customer.accessToken, restaurantId, itemId);

      await advanceOrder(owner.accessToken, order.id, ['ACCEPT', 'PREPARE', 'READY']);
      const assigned = await request(app.getHttpServer())
        .get(`/api/v1/deliveries/by-order/${order.id}`)
        .set(bearer(customer.accessToken))
        .expect(200);
      const driverSessions = [driver, replacement, outsider];
      const assignedDriver = driverSessions.find(
        (session) => session.driverId === assigned.body.data.driverId,
      );
      expect(assignedDriver).toBeTruthy();
      const unauthorizedDriver = driverSessions.find(
        (session) => session.driverId !== assigned.body.data.driverId,
      );
      expect(unauthorizedDriver).toBeTruthy();

      const unauthorized = await request(app.getHttpServer())
        .post(`/api/v1/deliveries/${assigned.body.data.id}/release`)
        .set(bearer(unauthorizedDriver!.accessToken))
        .send({ reason: 'Not my delivery.' });
      expect(unauthorized.status).toBe(403);

      const released = await request(app.getHttpServer())
        .post(`/api/v1/deliveries/${assigned.body.data.id}/release`)
        .set(bearer(assignedDriver!.accessToken))
        .send({ reason: 'Vehicle breakdown.' })
        .expect(201);
      expect(released.body.data.driverId).not.toBe(assignedDriver!.driverId);
      expect([driver.driverId, replacement.driverId, outsider.driverId]).toContain(
        released.body.data.driverId,
      );
      expect(released.body.data.status).toBe('ASSIGNED');

      const stillActive = await request(app.getHttpServer())
        .get(`/api/v1/orders/${order.id}`)
        .set(bearer(customer.accessToken))
        .expect(200);
      expect(stillActive.body.data.status).toBe('READY');
      expect(
        (await driverModel.findById(assignedDriver!.driverId).lean())?.activeDeliveryId,
      ).toBeNull();
    });

    it('does not release delivered deliveries and fails suspension before finalizing it', async () => {
      const { owner, restaurantId, itemId } = await setupRestaurantWithMenu();
      const customer = await registerCustomer();
      const driver = await registerDriverSession();
      const admin = await loginAsAdmin();
      const driverUser = await userModel.findOne({ email: driver.user.email }).lean();
      expect(driverUser).toBeTruthy();
      const order = await placeOrder(customer.accessToken, restaurantId, itemId);

      await advanceOrder(owner.accessToken, order.id, ['ACCEPT', 'PREPARE', 'READY']);
      const assigned = await request(app.getHttpServer())
        .get(`/api/v1/deliveries/by-order/${order.id}`)
        .set(bearer(customer.accessToken))
        .expect(200);
      const deliveryId = assigned.body.data.id as string;

      await request(app.getHttpServer())
        .post(`/api/v1/deliveries/${deliveryId}/transition`)
        .set(bearer(driver.accessToken))
        .send({ action: 'ARRIVE_AT_RESTAURANT' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/deliveries/${deliveryId}/transition`)
        .set(bearer(driver.accessToken))
        .send({ action: 'PICK_UP' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/deliveries/${deliveryId}/transition`)
        .set(bearer(driver.accessToken))
        .send({ action: 'START_TRANSIT' })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/v1/deliveries/${deliveryId}/transition`)
        .set(bearer(driver.accessToken))
        .send({ action: 'DELIVER' })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/deliveries/${deliveryId}/release`)
        .set(bearer(admin.accessToken))
        .send({ reason: 'Late release attempt.' })
        .expect(409);

      const suspensionResponse = await request(app.getHttpServer())
        .patch(`/api/v1/admin/accounts/${driverUser?._id.toString()}/status`)
        .set(bearer(admin.accessToken))
        .send({ status: AccountStatus.SUSPENDED, reason: 'Policy violation.' });
      expect(suspensionResponse.status).toBe(200);
      const suspension = suspensionResponse;
      expect(suspension.body.data.accountStatus).toBe(AccountStatus.SUSPENDED);

      const repeated = await request(app.getHttpServer())
        .patch(`/api/v1/admin/accounts/${driverUser?._id.toString()}/status`)
        .set(bearer(admin.accessToken))
        .send({ status: AccountStatus.SUSPENDED })
        .expect(200);
      expect(repeated.body.data.accountStatus).toBe(AccountStatus.SUSPENDED);
    });

    it('rejects client actorId and approves accounts from the authenticated admin', async () => {
      const driverEmail = uniqueEmail('p2-pending-driver');
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Pending Review Driver',
          email: driverEmail,
          password: PASSWORD,
          role: 'DRIVER',
          driver: {
            phone: '+1 917 555 0120',
            serviceArea: 'Latakia',
            vehicle: 'bike',
          },
        })
        .expect(201);
      const admin = await loginAsAdmin();
      const driverUser = await userModel.findOne({ email: driverEmail }).lean();
      expect(driverUser).toBeTruthy();

      await request(app.getHttpServer())
        .patch(`/api/v1/admin/accounts/${driverUser?._id.toString()}/status`)
        .set(bearer(admin.accessToken))
        .send({
          status: AccountStatus.APPROVED,
          reason: 'Documents verified.',
          actorId: '000000000000000000000000',
        })
        .expect(400);

      const rejected = await request(app.getHttpServer())
        .patch(`/api/v1/admin/accounts/${driverUser?._id.toString()}/status`)
        .set(bearer(admin.accessToken))
        .send({
          status: AccountStatus.REJECTED,
          reason: 'Documents incomplete.',
        })
        .expect(200);
      expect(rejected.body.data.accountStatus).toBe(AccountStatus.REJECTED);

      const approved = await request(app.getHttpServer())
        .patch(`/api/v1/admin/accounts/${driverUser?._id.toString()}/status`)
        .set(bearer(admin.accessToken))
        .send({
          status: AccountStatus.APPROVED,
          reason: 'Documents verified after review.',
        })
        .expect(200);

      expect(approved.body.data.accountStatus).toBe(AccountStatus.APPROVED);
      expect((await userModel.findById(driverUser?._id).lean())?.accountStatus).toBe(
        AccountStatus.APPROVED,
      );
    });

    it('does not finalize suspension when active delivery release fails', async () => {
      const { owner, restaurantId, itemId } = await setupRestaurantWithMenu();
      const customer = await registerCustomer();
      const driver = await registerDriverSession();
      const admin = await loginAsAdmin();
      const driverUser = await userModel.findOne({ email: driver.user.email }).lean();
      expect(driverUser).toBeTruthy();
      const order = await placeOrder(customer.accessToken, restaurantId, itemId);
      await advanceOrder(owner.accessToken, order.id, ['ACCEPT', 'PREPARE', 'READY']);

      const failure = jest
        .spyOn(deliveriesService, 'releaseAssignmentForAccountStatus')
        .mockRejectedValueOnce(new Error('release unavailable'));
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/admin/accounts/${driverUser?._id.toString()}/status`)
        .set(bearer(admin.accessToken))
        .send({ status: AccountStatus.SUSPENDED })
        .expect(500);
      expect(response.body.code).toBe('internal_error');
      expect((await userModel.findById(driverUser?._id).lean())?.accountStatus).toBe(
        AccountStatus.APPROVED,
      );
      failure.mockRestore();
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

  it('scopes coupons per restaurant and enforces the platform redemption rules', async () => {
    const { owner, restaurantId, itemId } = await setupRestaurantWithMenu();
    const otherOwner = await registerOwner(
      uniqueEmail('promo-other-owner'),
      'Other Coupon Kitchen',
    );
    await approveUser(otherOwner.user.email);
    const otherRestaurantId = otherOwner.user.restaurantId as string;
    await restaurantModel.updateOne(
      { _id: otherRestaurantId },
      {
        $set: {
          status: RestaurantStatus.APPROVED,
          isOpen: true,
          minOrder: 0,
          deliveryFee: 3,
        },
      },
    );

    const admin = await loginAsAdmin();
    const customer = await registerCustomer();

    // Owners can only create coupons for their own restaurant.
    const ownerCoupon = await request(app.getHttpServer())
      .post('/api/v1/restaurant-promotions')
      .set(bearer(owner.accessToken))
      .send({
        code: 'OWNER10',
        title: 'Owner ten percent',
        discountType: 'PERCENTAGE',
        value: 10,
        usageLimit: 10,
        perCustomerLimit: 2,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(201);
    expect(ownerCoupon.body.data).toMatchObject({
      code: 'OWNER10',
      scope: 'RESTAURANT',
      restaurantId,
      status: 'ACTIVE',
      usageCount: 0,
      usageLimit: 10,
      perCustomerLimit: 2,
    });
    const ownerCouponId = ownerCoupon.body.data.id as string;

    const ownerGlobal = await request(app.getHttpServer())
      .post('/api/v1/restaurant-promotions')
      .set(bearer(owner.accessToken))
      .send({
        code: 'OWNERGLOBAL',
        title: 'Owner global attempt',
        scope: 'GLOBAL',
        discountType: 'FIXED',
        value: 5,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(403);
    expect(ownerGlobal.body.code).toBe('promotion_global_forbidden');

    const ownerForeign = await request(app.getHttpServer())
      .post('/api/v1/restaurant-promotions')
      .set(bearer(owner.accessToken))
      .send({
        code: 'OWNERFOREIGN',
        title: 'Owner foreign attempt',
        restaurantId: otherRestaurantId,
        discountType: 'FIXED',
        value: 5,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(403);
    expect(ownerForeign.body.code).toBe('promotion_restaurant_forbidden');

    // A different owner cannot read, edit, inspect or delete the coupon.
    const foreignList = await request(app.getHttpServer())
      .get('/api/v1/restaurant-promotions')
      .set(bearer(otherOwner.accessToken))
      .expect(200);
    expect(
      (foreignList.body.data as Array<{ id: string }>).some(
        (entry) => entry.id === ownerCouponId,
      ),
    ).toBe(false);

    const foreignUpdate = await request(app.getHttpServer())
      .patch(`/api/v1/restaurant-promotions/${ownerCouponId}`)
      .set(bearer(otherOwner.accessToken))
      .send({ title: 'Hijacked coupon' })
      .expect(403);
    expect(foreignUpdate.body.code).toBe('promotion_not_owned');

    const foreignUsage = await request(app.getHttpServer())
      .get(`/api/v1/restaurant-promotions/${ownerCouponId}/usage`)
      .set(bearer(otherOwner.accessToken))
      .expect(403);
    expect(foreignUsage.body.code).toBe('promotion_not_owned');

    const foreignDelete = await request(app.getHttpServer())
      .delete(`/api/v1/restaurant-promotions/${ownerCouponId}`)
      .set(bearer(otherOwner.accessToken))
      .expect(403);
    expect(foreignDelete.body.code).toBe('promotion_not_owned');

    // Admins manage platform-wide coupons and can filter both scopes.
    const globalCoupon = await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(bearer(admin.accessToken))
      .send({
        code: 'PLATFORM5',
        title: 'Platform five dollars',
        scope: 'GLOBAL',
        discountType: 'FIXED',
        value: 5,
        minOrder: 20,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(201);
    expect(globalCoupon.body.data).toMatchObject({
      code: 'PLATFORM5',
      scope: 'GLOBAL',
      status: 'ACTIVE',
    });
    expect(globalCoupon.body.data.restaurantId).toBeUndefined();

    const scheduled = await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(bearer(admin.accessToken))
      .send({
        code: 'SOON15',
        title: 'Scheduled coupon',
        discountType: 'PERCENTAGE',
        value: 15,
        startsAt: new Date(Date.now() + 86_400_000).toISOString(),
        expiresAt: new Date(Date.now() + 172_800_000).toISOString(),
      })
      .expect(201);
    expect(scheduled.body.data.status).toBe('SCHEDULED');

    const globalList = await request(app.getHttpServer())
      .get('/api/v1/promotions/admin?scope=GLOBAL')
      .set(bearer(admin.accessToken))
      .expect(200);
    const globalCodes = (globalList.body.data as Array<{ code: string }>).map(
      (entry) => entry.code,
    );
    expect(globalCodes).toContain('PLATFORM5');
    expect(globalCodes).not.toContain('OWNER10');

    const otherRestaurantList = await request(app.getHttpServer())
      .get(`/api/v1/promotions/admin?scope=RESTAURANT&restaurantId=${otherRestaurantId}`)
      .set(bearer(admin.accessToken))
      .expect(200);
    expect(otherRestaurantList.body.data).toEqual([]);

    const scheduledList = await request(app.getHttpServer())
      .get('/api/v1/promotions/admin?status=SCHEDULED')
      .set(bearer(admin.accessToken))
      .expect(200);
    expect(
      (scheduledList.body.data as Array<{ code: string }>).some(
        (entry) => entry.code === 'SOON15',
      ),
    ).toBe(true);

    // An expired coupon can never be re-activated without a new expiry date.
    const expired = await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(bearer(admin.accessToken))
      .send({
        code: 'OLDPROMO',
        title: 'Soon expired',
        discountType: 'FIXED',
        value: 2,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(201);
    await promotionModel.updateOne(
      { _id: expired.body.data.id },
      { $set: { expiresAt: new Date(Date.now() - 60_000) } },
    );
    const reactivate = await request(app.getHttpServer())
      .patch(`/api/v1/promotions/${expired.body.data.id}/status`)
      .set(bearer(admin.accessToken))
      .send({ active: true })
      .expect(409);
    expect(reactivate.body.code).toBe('promotion_expired');

    // Restaurant-scoped coupons are rejected at a different restaurant.
    await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(bearer(admin.accessToken))
      .send({
        code: 'OTHERONLY',
        title: 'Other restaurant only',
        scope: 'RESTAURANT',
        restaurantId: otherRestaurantId,
        discountType: 'FIXED',
        value: 4,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(201);

    const wrongRestaurant = await request(app.getHttpServer())
      .post('/api/v1/promotions/validate')
      .set(bearer(customer.accessToken))
      .send({ code: 'OTHERONLY', restaurantId, subtotal: 25 })
      .expect(201);
    expect(wrongRestaurant.body.data.valid).toBe(false);
    expect(wrongRestaurant.body.data.message).toContain('not available for this restaurant');

    // Free delivery discounts the server-computed delivery fee, capped here.
    await request(app.getHttpServer())
      .post('/api/v1/restaurant-promotions')
      .set(bearer(owner.accessToken))
      .send({
        code: 'FREEDEL',
        title: 'Free delivery capped',
        discountType: 'FREE_DELIVERY',
        maxDiscount: 2,
        perCustomerLimit: 2,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(201);

    const freeQuote = await request(app.getHttpServer())
      .post('/api/v1/checkout/quote')
      .set(bearer(customer.accessToken))
      .send({
        restaurantId,
        items: [{ productId: itemId, quantity: 2, selectedOptions: [] }],
        couponCode: 'freedel',
      })
      .expect(201);
    expect(freeQuote.body.data).toMatchObject({
      subtotal: 25,
      deliveryFee: 3,
      discount: 2,
      total: 28.5,
    });
    expect(freeQuote.body.data.promotion).toMatchObject({
      valid: true,
      freeDelivery: true,
      discount: 2,
    });

    const freeOrder = await placeOrder(customer.accessToken, restaurantId, itemId, {
      couponCode: 'FREEDEL',
    });
    expect(freeOrder.totals.discount).toBe(2);
    expect(freeOrder.totals.total).toBe(28.5);

    // First-order-only coupons reject customers with prior orders.
    await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(bearer(admin.accessToken))
      .send({
        code: 'FIRST5',
        title: 'First order five',
        discountType: 'FIXED',
        value: 5,
        firstOrderOnly: true,
        perCustomerLimit: 5,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(201);

    const returningCustomer = await request(app.getHttpServer())
      .post('/api/v1/promotions/validate')
      .set(bearer(customer.accessToken))
      .send({ code: 'FIRST5', restaurantId, subtotal: 25 })
      .expect(201);
    expect(returningCustomer.body.data.valid).toBe(false);
    expect(returningCustomer.body.data.message).toContain('first orders only');

    const newcomer = await registerCustomer();
    const firstTimer = await request(app.getHttpServer())
      .post('/api/v1/promotions/validate')
      .set(bearer(newcomer.accessToken))
      .send({ code: 'FIRST5', restaurantId, subtotal: 25 })
      .expect(201);
    expect(firstTimer.body.data.valid).toBe(true);
    expect(firstTimer.body.data.discount).toBe(5);

    // A total usage limit is enforced before a second redemption.
    const once = await request(app.getHttpServer())
      .post('/api/v1/promotions')
      .set(bearer(admin.accessToken))
      .send({
        code: 'ONCE3',
        title: 'Only once',
        discountType: 'FIXED',
        value: 3,
        usageLimit: 1,
        perCustomerLimit: 5,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(201);
    const onceId = once.body.data.id as string;

    const onceOrder = await placeOrder(newcomer.accessToken, restaurantId, itemId, {
      couponCode: 'ONCE3',
    });
    expect(onceOrder.couponCode).toBe('ONCE3');
    expect(onceOrder.totals.discount).toBe(3);

    const thirdCustomer = await registerCustomer();
    const exhausted = await request(app.getHttpServer())
      .post('/api/v1/promotions/validate')
      .set(bearer(thirdCustomer.accessToken))
      .send({ code: 'ONCE3', restaurantId, subtotal: 25 })
      .expect(201);
    expect(exhausted.body.data.valid).toBe(false);
    expect(exhausted.body.data.message).toContain('usage limit');

    // Usage statistics are only returned to the owner and admin.
    const ownerUsage = await request(app.getHttpServer())
      .get(`/api/v1/restaurant-promotions/${ownerCouponId}/usage`)
      .set(bearer(owner.accessToken))
      .expect(200);
    expect(ownerUsage.body.data).toMatchObject({
      totalRedemptions: 0,
      totalDiscount: 0,
    });

    const adminUsage = await request(app.getHttpServer())
      .get(`/api/v1/promotions/${onceId}/usage`)
      .set(bearer(admin.accessToken))
      .expect(200);
    expect(adminUsage.body.data).toMatchObject({
      totalRedemptions: 1,
      totalDiscount: 3,
    });
    expect(adminUsage.body.data.recent).toHaveLength(1);
    expect(adminUsage.body.data.recent[0].orderId).toBe(onceOrder.id);

    // Unused coupons can be removed; redeemed coupons must be deactivated.
    await request(app.getHttpServer())
      .delete(`/api/v1/promotions/${globalCoupon.body.data.id}`)
      .set(bearer(admin.accessToken))
      .expect(204);

    const usedDelete = await request(app.getHttpServer())
      .delete(`/api/v1/promotions/${onceId}`)
      .set(bearer(admin.accessToken))
      .expect(409);
    expect(usedDelete.body.code).toBe('promotion_in_use');

    // Deactivating a coupon immediately blocks new redemptions.
    const ownerDeactivated = await request(app.getHttpServer())
      .patch(`/api/v1/restaurant-promotions/${ownerCouponId}/status`)
      .set(bearer(owner.accessToken))
      .send({ active: false })
      .expect(200);
    expect(ownerDeactivated.body.data.status).toBe('INACTIVE');

    const inactiveValidation = await request(app.getHttpServer())
      .post('/api/v1/promotions/validate')
      .set(bearer(customer.accessToken))
      .send({ code: 'OWNER10', restaurantId, subtotal: 25 })
      .expect(201);
    expect(inactiveValidation.body.data.valid).toBe(false);
    expect(inactiveValidation.body.data.message).toContain('not active');

    // An owner may remove an unused coupon of their own.
    await request(app.getHttpServer())
      .delete(`/api/v1/restaurant-promotions/${ownerCouponId}`)
      .set(bearer(owner.accessToken))
      .expect(204);

    const afterDelete = await request(app.getHttpServer())
      .get('/api/v1/restaurant-promotions')
      .set(bearer(owner.accessToken))
      .expect(200);
    expect(
      (afterDelete.body.data as Array<{ code: string }>).some(
        (entry) => entry.code === 'OWNER10',
      ),
    ).toBe(false);
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

  it('accepts browser-precision GPS and persists a normalized driver fix', async () => {
    const driver = await registerDriverSession();

    // A real `navigator.geolocation` reading has far more decimal places than
    // a fixed validation limit. It must be normalized, not rejected: a 400
    // here is what left `lastLocation` empty and blocked auto-assignment.
    const published = await request(app.getHttpServer())
      .put(`/api/v1/drivers/${driver.driverId}/location`)
      .set(bearer(driver.accessToken))
      .send({
        lat: 35.521547423412,
        lng: 35.791276382145,
        heading: 123.4567,
        speedKph: 12.34567,
      })
      .expect(200);

    expect(published.body.data).toMatchObject({
      driverId: driver.driverId,
      lat: 35.521547,
      lng: 35.791276,
      heading: 123.46,
      speedKph: 12.35,
    });

    const stored = await driverModel
      .findById(driver.driverId)
      .select('lastLocation')
      .lean()
      .exec();
    expect(stored?.lastLocation).toMatchObject({
      lat: 35.521547,
      lng: 35.791276,
    });
    expect(stored?.lastLocation?.updatedAt).toBeInstanceOf(Date);

    const fetched = await request(app.getHttpServer())
      .get(`/api/v1/drivers/${driver.driverId}/location`)
      .set(bearer(driver.accessToken))
      .expect(200);
    expect(fetched.body.data).toMatchObject({ lat: 35.521547, lng: 35.791276 });

    // Impossible coordinates are still rejected, so normalization did not
    // weaken the range checks.
    const impossible = await request(app.getHttpServer())
      .put(`/api/v1/drivers/${driver.driverId}/location`)
      .set(bearer(driver.accessToken))
      .send({ lat: 91, lng: 35.791276 })
      .expect(400);
    expect(impossible.body.code).toBe('validation_failed');
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

  it('returns zeroed platform analytics for an empty database', async () => {
    const admin = await loginAsAdmin();

    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/analytics?range=7d')
      .set(bearer(admin.accessToken))
      .expect(200);

    const analytics = response.body.data;
    expect(analytics.range).toBe('7d');
    expect(analytics.granularity).toBe('day');
    expect(analytics.series).toHaveLength(7);
    expect(analytics.summary).toMatchObject({
      totalCustomers: 0,
      totalOwners: 0,
      totalDrivers: 0,
      totalRestaurants: 0,
      totalOrders: 0,
      pendingOrders: 0,
      activeOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      revenue: 0,
      averageOrderValue: 0,
      previousRevenue: 0,
      revenueGrowthPercent: null,
    });
    expect(analytics.orderDistribution).toEqual([]);
    expect(analytics.deliveryDistribution).toEqual([]);
    expect(
      analytics.series.every(
        (point: { revenue: number; totalOrders: number; completedOrders: number }) =>
          point.revenue === 0 && point.totalOrders === 0 && point.completedOrders === 0,
      ),
    ).toBe(true);
  }, 60000);

  it('returns platform analytics that match the database records', async () => {
    const { owner, restaurantId, itemId } = await setupRestaurantWithMenu();
    const customer = await registerCustomer();
    const admin = await loginAsAdmin();

    const completed = await placeOrder(customer.accessToken, restaurantId, itemId);
    const cancelled = await placeOrder(customer.accessToken, restaurantId, itemId);
    await orderModel.updateOne(
      { _id: completed.id },
      { $set: { status: 'COMPLETED', completedAt: new Date() } },
    );
    await orderModel.updateOne(
      { _id: cancelled.id },
      { $set: { status: 'CANCELLED', cancelledAt: new Date() } },
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/analytics?range=30d')
      .set(bearer(admin.accessToken))
      .expect(200);

    const analytics = response.body.data;
    expect(analytics.series).toHaveLength(30);
    expect(analytics.summary).toMatchObject({
      totalCustomers: 1,
      totalOwners: 1,
      totalRestaurants: 1,
      totalOrders: 2,
      pendingOrders: 0,
      completedOrders: 1,
      cancelledOrders: 1,
      previousRevenue: 0,
      revenueGrowthPercent: null,
    });
    expect(analytics.summary.totalDrivers).toBe(0);
    expect(analytics.summary.revenue).toBeCloseTo(completed.totals.total, 2);
    expect(analytics.summary.averageOrderValue).toBeCloseTo(completed.totals.total, 2);
    expect(analytics.orderDistribution).toEqual(
      expect.arrayContaining([
        { status: 'COMPLETED', count: 1 },
        { status: 'CANCELLED', count: 1 },
      ]),
    );

    const seriesRevenue = analytics.series.reduce(
      (total: number, point: { revenue: number }) => total + point.revenue,
      0,
    );
    expect(seriesRevenue).toBeCloseTo(analytics.summary.revenue, 2);
    expect(owner.user.role).toBe('RESTAURANT_OWNER');
  }, 60000);

  it('restricts platform analytics to administrators', async () => {
    const { owner } = await setupRestaurantWithMenu();
    const customer = await registerCustomer();
    const driver = await registerDriverSession();

    for (const session of [owner, customer, driver]) {
      await request(app.getHttpServer())
        .get('/api/v1/admin/analytics')
        .set(bearer(session.accessToken))
        .expect(403);
    }
    await request(app.getHttpServer()).get('/api/v1/admin/analytics').expect(401);
  }, 60000);

  it('auto-assigns the nearest eligible driver using fresh GPS coordinates', async () => {
    const { owner, restaurantId, itemId } = await setupRestaurantWithMenu();
    const customer = await registerCustomer();
    const nearDriver = await registerDriverSession();
    const farDriver = await registerDriverSession();
    const now = new Date();

    // The restaurant sits at the Latakia city centre used by the fixtures.
    await driverModel.updateOne(
      { _id: nearDriver.driverId },
      {
        $set: {
          availability: 'AVAILABLE',
          activeDeliveryId: null,
          lastLocation: { lat: 35.52, lng: 35.7918, updatedAt: now },
        },
      },
    );
    await driverModel.updateOne(
      { _id: farDriver.driverId },
      {
        $set: {
          availability: 'AVAILABLE',
          activeDeliveryId: null,
          lastLocation: { lat: 35.56, lng: 35.82, updatedAt: now },
        },
      },
    );

    const order = await placeOrder(customer.accessToken, restaurantId, itemId);
    await advanceOrder(owner.accessToken, order.id, ['ACCEPT', 'PREPARE', 'READY']);

    const delivery = await request(app.getHttpServer())
      .get(`/api/v1/deliveries/by-order/${order.id}`)
      .set(bearer(customer.accessToken))
      .expect(200);

    expect(delivery.body.data.status).toBe('ASSIGNED');
    expect(delivery.body.data.driverId).toBe(nearDriver.driverId);
    expect(delivery.body.data.autoAssignment).toMatchObject({
      status: 'ASSIGNED',
      lastTrigger: 'ORDER_READY',
    });

    const assignmentEvent = (
      delivery.body.data.assignmentHistory as Array<Record<string, unknown>>
    ).find((event) => event.action === 'ASSIGNED');
    expect(assignmentEvent).toMatchObject({
      newDriverId: nearDriver.driverId,
      source: 'AUTOMATIC',
    });

    const nearDoc = await driverModel.findById(nearDriver.driverId).lean();
    expect(nearDoc?.availability).toBe('ON_DELIVERY');
    expect(nearDoc?.activeDeliveryId?.toString()).toBe(delivery.body.data.id);
    const farDoc = await driverModel.findById(farDriver.driverId).lean();
    expect(farDoc?.availability).toBe('AVAILABLE');
    expect(farDoc?.activeDeliveryId).toBeNull();
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
