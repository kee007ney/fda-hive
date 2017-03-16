
DROP PROCEDURE IF EXISTS `sp_permission_check_v2`;

DELIMITER //

CREATE PROCEDURE `sp_permission_check_v2`(
    IN p_user_id BIGINT UNSIGNED,
    IN p_member_sql VARCHAR(4096),
    IN p_obj_domainID BIGINT UNSIGNED,
    IN p_obj_id BIGINT UNSIGNED,
    IN p_permissions BIGINT UNSIGNED,
    OUT p_perm BIGINT UNSIGNED
)
    READS SQL DATA
BEGIN
/*
 *  ::718604!
 * 
 * Copyright(C) November 20, 2014 U.S. Food and Drug Administration
 * Authors: Dr. Vahan Simonyan (1), Dr. Raja Mazumder (2), et al
 * Affiliation: Food and Drug Administration (1), George Washington University (2)
 * 
 * All rights Reserved.
 * 
 * The MIT License (MIT)
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

    SET @q = CONCAT('SELECT SUM(', IF(p_member_sql = ' TRUE ', '0xFFFFFFFF', 'p.bits'),
        ' & ?) FROM UPGroup g JOIN UPPerm p USING (groupID) JOIN
        UPObj o ON o.domainID = p.domainID AND o.objID = p.objID
        WHERE o.domainID = ? AND o.objID = ? AND ',
        p_member_sql, ' INTO @res');

    PREPARE x FROM @q;
    SET @perm = p_permissions;
    SET @dom = IFNULL(p_obj_domainID, 0);
    SET @oid = p_obj_id;
    EXECUTE x USING @perm, @dom, @oid;

    SET p_perm = @res;
END //
DELIMITER ;
