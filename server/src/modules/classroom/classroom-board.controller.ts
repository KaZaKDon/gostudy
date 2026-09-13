import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import type { SessionUser } from '../auth/session-user';
import { ClassroomBoardService } from './classroom-board.service';
import { ClassroomBoardQueryDto } from './dto/classroom-board-query.dto';
import { ClassroomBoardStrokeDto } from './dto/classroom-board-stroke.dto';
import { ClassroomBoardTextDto, ClassroomBoardTextUpdateDto } from './dto/classroom-board-text.dto';
import { ClassroomLessonDto } from './dto/classroom-lesson.dto';

@Controller('classroom/board')
@UseGuards(SessionAuthGuard)
export class ClassroomBoardController {
    constructor(private readonly board: ClassroomBoardService) {}

    @Get()
    getState(
        @CurrentUser() user: SessionUser,
        @Query() input: ClassroomBoardQueryDto,
    ) {
        return this.board.getState(user, input);
    }

    @Post('strokes')
    addStroke(
        @CurrentUser() user: SessionUser,
        @Body() input: ClassroomBoardStrokeDto,
    ) {
        return this.board.addStroke(user, input);
    }

    @Post('texts')
    addText(@CurrentUser() user: SessionUser, @Body() input: ClassroomBoardTextDto) {
        return this.board.addText(user, input);
    }

    @Patch('texts/:id')
    updateText(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) id: number,
        @Body() input: ClassroomBoardTextUpdateDto,
    ) {
        return this.board.updateText(user, id, input);
    }

    @Delete('texts/:id')
    deleteText(
        @CurrentUser() user: SessionUser,
        @Param('id', ParseIntPipe) id: number,
        @Query('lesson_id', ParseIntPipe) lessonId: number,
    ) {
        return this.board.deleteText(user, lessonId, id);
    }

    @Post('clear')
    clear(
        @CurrentUser() user: SessionUser,
        @Body() input: ClassroomLessonDto,
    ) {
        return this.board.clear(user, input.lesson_id);
    }
}
