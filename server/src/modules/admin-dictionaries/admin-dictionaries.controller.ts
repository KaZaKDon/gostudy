import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';

import { getRequestMetadata } from '../../common/http/request-metadata';
import { AdminAccessGuard } from '../auth/admin-access.guard';
import {
    type AuthenticatedRequest,
    SessionAuthGuard,
} from '../auth/session-auth.guard';
import { AdminDictionariesService } from './admin-dictionaries.service';
import { ListDictionaryItemsQueryDto } from './dto/list-dictionary-items-query.dto';
import {
    SaveDictionaryItemDto,
    SaveGroupedDictionaryItemDto,
} from './dto/save-dictionary-item.dto';
import { UpdateSubjectPreparationsDto } from './dto/update-subject-preparations.dto';

@Controller('admin/dictionaries')
@UseGuards(SessionAuthGuard, AdminAccessGuard)
export class AdminDictionariesController {
    constructor(private readonly dictionaries: AdminDictionariesService) {}

    @Get('subject-groups')
    listSubjectGroups(@Req() request: AuthenticatedRequest) {
        return this.dictionaries.listSubjectGroups(request.authenticatedUser);
    }

    @Post('subject-groups')
    createSubjectGroup(@Req() request: AuthenticatedRequest, @Body() input: SaveDictionaryItemDto) {
        return this.dictionaries.createSubjectGroup(request.authenticatedUser, input, getRequestMetadata(request));
    }

    @Patch('subject-groups/:id')
    updateSubjectGroup(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() input: SaveDictionaryItemDto) {
        return this.dictionaries.updateSubjectGroup(request.authenticatedUser, id, input, getRequestMetadata(request));
    }

    @Delete('subject-groups/:id')
    deleteSubjectGroup(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.dictionaries.deleteSubjectGroup(request.authenticatedUser, id, getRequestMetadata(request));
    }

    @Get('subjects')
    listSubjects(@Req() request: AuthenticatedRequest, @Query() query: ListDictionaryItemsQueryDto) {
        return this.dictionaries.listSubjects(request.authenticatedUser, query);
    }

    @Post('subjects')
    createSubject(@Req() request: AuthenticatedRequest, @Body() input: SaveGroupedDictionaryItemDto) {
        return this.dictionaries.createSubject(request.authenticatedUser, input, getRequestMetadata(request));
    }

    @Patch('subjects/:id')
    updateSubject(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() input: SaveGroupedDictionaryItemDto) {
        return this.dictionaries.updateSubject(request.authenticatedUser, id, input, getRequestMetadata(request));
    }

    @Delete('subjects/:id')
    deleteSubject(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.dictionaries.deleteSubject(request.authenticatedUser, id, getRequestMetadata(request));
    }

    @Get('preparation-groups')
    listPreparationGroups(@Req() request: AuthenticatedRequest) {
        return this.dictionaries.listPreparationGroups(request.authenticatedUser);
    }

    @Post('preparation-groups')
    createPreparationGroup(@Req() request: AuthenticatedRequest, @Body() input: SaveDictionaryItemDto) {
        return this.dictionaries.createPreparationGroup(request.authenticatedUser, input, getRequestMetadata(request));
    }

    @Patch('preparation-groups/:id')
    updatePreparationGroup(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() input: SaveDictionaryItemDto) {
        return this.dictionaries.updatePreparationGroup(request.authenticatedUser, id, input, getRequestMetadata(request));
    }

    @Delete('preparation-groups/:id')
    deletePreparationGroup(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.dictionaries.deletePreparationGroup(request.authenticatedUser, id, getRequestMetadata(request));
    }

    @Get('preparations')
    listPreparations(@Req() request: AuthenticatedRequest, @Query() query: ListDictionaryItemsQueryDto) {
        return this.dictionaries.listPreparations(request.authenticatedUser, query);
    }

    @Post('preparations')
    createPreparation(@Req() request: AuthenticatedRequest, @Body() input: SaveGroupedDictionaryItemDto) {
        return this.dictionaries.createPreparation(request.authenticatedUser, input, getRequestMetadata(request));
    }

    @Patch('preparations/:id')
    updatePreparation(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() input: SaveGroupedDictionaryItemDto) {
        return this.dictionaries.updatePreparation(request.authenticatedUser, id, input, getRequestMetadata(request));
    }

    @Delete('preparations/:id')
    deletePreparation(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.dictionaries.deletePreparation(request.authenticatedUser, id, getRequestMetadata(request));
    }

    @Get('age-groups')
    listAgeGroups(@Req() request: AuthenticatedRequest) {
        return this.dictionaries.listAgeGroups(request.authenticatedUser);
    }

    @Post('age-groups')
    createAgeGroup(@Req() request: AuthenticatedRequest, @Body() input: SaveDictionaryItemDto) {
        return this.dictionaries.createAgeGroup(request.authenticatedUser, input, getRequestMetadata(request));
    }

    @Patch('age-groups/:id')
    updateAgeGroup(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number, @Body() input: SaveDictionaryItemDto) {
        return this.dictionaries.updateAgeGroup(request.authenticatedUser, id, input, getRequestMetadata(request));
    }

    @Delete('age-groups/:id')
    deleteAgeGroup(@Req() request: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
        return this.dictionaries.deleteAgeGroup(request.authenticatedUser, id, getRequestMetadata(request));
    }

    @Get('subject-preparations')
    listSubjectPreparations(@Req() request: AuthenticatedRequest) {
        return this.dictionaries.listSubjectPreparations(request.authenticatedUser);
    }

    @Get('subject-preparations/:subjectId')
    getSubjectPreparations(@Req() request: AuthenticatedRequest, @Param('subjectId', ParseIntPipe) subjectId: number) {
        return this.dictionaries.getSubjectPreparations(request.authenticatedUser, subjectId);
    }

    @Put('subject-preparations/:subjectId')
    updateSubjectPreparations(@Req() request: AuthenticatedRequest, @Param('subjectId', ParseIntPipe) subjectId: number, @Body() input: UpdateSubjectPreparationsDto) {
        return this.dictionaries.updateSubjectPreparations(request.authenticatedUser, subjectId, input, getRequestMetadata(request));
    }
}
