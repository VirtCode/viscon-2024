package ch.olivezebra.mensa.database.group;

import ch.olivezebra.mensa.database.user.User;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

public interface GroupRepository extends CrudRepository<Group, UUID>  {

    /**
     * Fetches all groups a user is part of.
     * @param user user to find for
     * @return a list (duh)
    @Query("SELECT g FROM eating_group g WHERE :user IN g.members")
    List<Group> findGroupsForUser(User user);
     */

    /**
     * throws if user doesn't have access
     * @return group
     */
    default Group requireAccessGroup(UUID group, User user) {
        Group g = this.findById(group)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No such group in database"));

        if (!g.getMembers().contains(user))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not in group");

        return g;
    }

}
