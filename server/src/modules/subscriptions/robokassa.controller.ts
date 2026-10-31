import { Body, Controller, Get, Header, HttpCode, Post, Query, Redirect } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';

@Controller('payments/robokassa')
export class RobokassaController {
    constructor(private readonly subscriptions: SubscriptionsService) {}

    // Callback is public: authentication is the mandatory Robokassa signature.
    @Post('result') @HttpCode(200) @Header('Content-Type', 'text/plain; charset=utf-8')
    result(@Body() body: Record<string, unknown>) { return this.subscriptions.result(body); }

    @Get('result') @Header('Content-Type', 'text/plain; charset=utf-8')
    getResult(@Query() query: Record<string, unknown>) { return this.subscriptions.result(query); }

    // Browser redirects never change a payment or subscription state.
    @Get('success') @Redirect('/account?section=payments&payment=returned', 303)
    success() {}
    @Post('success') @Redirect('/account?section=payments&payment=returned', 303)
    postSuccess() {}
    @Get('fail') @Redirect('/account?section=payments&payment=cancelled', 303)
    fail() {}
    @Post('fail') @Redirect('/account?section=payments&payment=cancelled', 303)
    postFail() {}
}
